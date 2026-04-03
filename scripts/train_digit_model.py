#!/usr/bin/env python3
"""
Train a tiny CNN to classify banjo tab fret digits (0-12) from 32x32 crops.

Usage:
  python scripts/train_digit_model.py --data training_export.json --epochs 30 --output public/models/digit-classifier.onnx

Input: JSON exported from TabTrainingManager (contains base64 images + corrected notes).
Output: ONNX model file (~200KB) for in-browser inference via ONNX Runtime Web.
"""

import argparse
import base64
import io
import json
import sys
from pathlib import Path

import numpy as np
import onnx
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image, ImageDraw
from torch.utils.data import DataLoader, TensorDataset


# ── Model architecture: LeNet-5 variant ─────────────────────────────────────

class TabDigitNet(nn.Module):
    """Small CNN for 32x32 grayscale digit classification (13 classes: 0-12)."""

    def __init__(self, num_classes: int = 13):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 16, 3, padding=1)
        self.conv2 = nn.Conv2d(16, 32, 3, padding=1)
        self.conv3 = nn.Conv2d(32, 64, 3, padding=1)
        self.fc1 = nn.Linear(64 * 4 * 4, 128)
        self.fc2 = nn.Linear(128, num_classes)

    def forward(self, x):
        x = F.relu(self.conv1(x))
        x = F.max_pool2d(x, 2)          # 32 -> 16
        x = F.relu(self.conv2(x))
        x = F.max_pool2d(x, 2)          # 16 -> 8
        x = F.relu(self.conv3(x))
        x = F.max_pool2d(x, 2)          # 8 -> 4
        x = x.view(x.size(0), -1)       # flatten
        x = F.relu(self.fc1(x))
        x = self.fc2(x)
        return x


# ── Staff line detection (mirrors TypeScript detectStaffLines) ───────────────

def detect_staff_lines(img_array: np.ndarray) -> list[int] | None:
    """
    Detect 5 staff lines in a grayscale image.
    Returns Y-centers of the 5 lines, or None if detection fails.
    """
    h, w = img_array.shape[:2]
    if len(img_array.shape) == 3:
        gray = np.mean(img_array[:, :, :3] * [0.299, 0.587, 0.114], axis=2)
    else:
        gray = img_array.astype(float)

    # Sample columns and average brightness per row
    sample_xs = [int(w * p) for p in [0.15, 0.3, 0.5, 0.7]]
    brightnesses = np.zeros(h)
    for sx in sample_xs:
        sx = min(sx, w - 1)
        brightnesses += gray[:, sx]
    brightnesses /= len(sample_xs)

    # Threshold
    sorted_b = np.sort(brightnesses)
    bg = sorted_b[int(len(sorted_b) * 0.8)]
    threshold = bg - 15

    dark_rows = np.where(brightnesses < threshold)[0]
    if len(dark_rows) == 0:
        return None

    # Cluster dark rows
    candidates = []
    cs = ce = dark_rows[0]
    for y in dark_rows[1:]:
        if y - ce <= 6:
            ce = y
        else:
            min_b = brightnesses[cs:ce + 1].min()
            candidates.append((int((cs + ce) // 2), float(min_b), ce - cs + 1))
            cs = ce = y
    min_b = brightnesses[cs:ce + 1].min()
    candidates.append((int((cs + ce) // 2), float(min_b), ce - cs + 1))

    # Filter thick candidates
    max_thickness = max(20, int(h * 0.05))
    thin = [(c, d, t) for c, d, t in candidates if t <= max_thickness]

    if len(thin) < 5:
        return None
    if len(thin) == 5:
        return [c for c, _, _ in thin]

    # Pick 5 darkest
    by_dark = sorted(thin, key=lambda x: x[1])
    top5 = sorted(by_dark[:5], key=lambda x: x[0])

    gaps = [top5[i + 1][0] - top5[i][0] for i in range(4)]
    avg_gap = sum(gaps) / len(gaps)
    if any(abs(g - avg_gap) / avg_gap > 0.3 for g in gaps):
        return None

    return [c for c, _, _ in top5]


# ── Note position detection (mirrors TypeScript detectNotePositions) ─────────

def detect_note_positions(img_array: np.ndarray, line_ys: list[int]) -> list[dict]:
    """Detect note positions and assign each to its nearest staff line."""
    h, w = img_array.shape[:2]
    if len(img_array.shape) == 3:
        gray = np.mean(img_array[:, :, :3] * [0.299, 0.587, 0.114], axis=2)
    else:
        gray = img_array.astype(float)

    sorted_b = np.sort(gray.ravel())
    bg = sorted_b[int(len(sorted_b) * 0.8)]
    threshold = bg - 20

    line_gap = line_ys[1] - line_ys[0]
    staff_top = max(0, line_ys[0] - line_gap // 2)
    staff_bot = min(h - 1, line_ys[4] + line_gap // 2)

    col_dark = np.zeros(w, dtype=int)
    for x in range(w):
        col_dark[x] = np.sum(gray[staff_top:staff_bot + 1, x] < threshold)

    sorted_cols = np.sort(col_dark)
    baseline = sorted_cols[len(sorted_cols) // 2]
    note_thresh = baseline + 4

    note_cols = np.where(col_dark > note_thresh)[0]
    if len(note_cols) == 0:
        return []

    # Cluster adjacent columns
    clusters = []
    cs = ce = note_cols[0]
    for x in note_cols[1:]:
        if x - ce <= 5:
            ce = x
        else:
            clusters.append((int(cs), int(ce)))
            cs = ce = x
    clusters.append((int(cs), int(ce)))

    # Filter by size
    min_w = 4
    max_w = line_gap * 1.5
    sized = [(s, e) for s, e in clusters if min_w <= e - s + 1 < max_w]

    band = max(3, line_gap // 3)
    notes = []
    for x0, x1 in sized:
        cw = x1 - x0 + 1
        line_darks = []
        for ly in line_ys:
            count = 0
            for x in range(x0, x1 + 1):
                for dy in range(-band, band + 1):
                    y = ly + dy
                    if 0 <= y < h and gray[y, x] < threshold:
                        count += 1
            line_darks.append(count)

        line_base = cw * 3
        extra = [c - line_base for c in line_darks]
        max_extra = max(extra)
        if max_extra < 5:
            continue

        sorted_extra = sorted(extra, reverse=True)
        if sorted_extra[1] > 0 and sorted_extra[0] < sorted_extra[1] * 1.5:
            continue

        line_idx = extra.index(max_extra)
        notes.append({
            "lineNum": line_idx + 1,
            "centerX": (x0 + x1) // 2,
            "clusterWidth": cw,
        })

    return notes


# ── Digit cropping ───────────────────────────────────────────────────────────

def crop_digit(img_array: np.ndarray, cx: int, cy: int, size: int = 32) -> np.ndarray:
    """Extract a size x size grayscale crop centered at (cx, cy)."""
    h, w = img_array.shape[:2]
    if len(img_array.shape) == 3:
        gray = np.mean(img_array[:, :, :3] * [0.299, 0.587, 0.114], axis=2)
    else:
        gray = img_array.astype(float)

    half = size // 2
    # Create white-padded output
    out = np.full((size, size), 255.0)

    sx = max(0, cx - half)
    sy = max(0, cy - half)
    ex = min(w, cx + half)
    ey = min(h, cy + half)

    src = gray[sy:ey, sx:ex]
    ox = (size - src.shape[1]) // 2
    oy = (size - src.shape[0]) // 2
    out[oy:oy + src.shape[0], ox:ox + src.shape[1]] = src

    return out


# ── Data loading ─────────────────────────────────────────────────────────────

# Combined finger+technique labels — must match LABEL_CLASSES in syntheticTabGenerator.ts
LABEL_CLASSES = ['T', 'I', 'M', 'T-P', 'T-H', 'I-H', 'I-P', 'T-SL', 'I-SL', 'M-SL']
LABEL_TO_IDX = {label: i for i, label in enumerate(LABEL_CLASSES)}


def load_training_data(json_path: str) -> tuple[
    list[np.ndarray], list[int],
    list[np.ndarray], list[int],
]:
    """
    Load exported JSON, crop digits and labels, build training pairs.
    Returns (digit_crops, digit_labels, label_crops, label_labels).
    """
    with open(json_path) as f:
        data = json.load(f)

    pairs = data.get("trainingData", [])
    digit_crops: list[np.ndarray] = []
    digit_labels: list[int] = []
    label_crops: list[np.ndarray] = []
    label_labels: list[int] = []
    skipped = 0

    for pair in pairs:
        # Decode image
        img_bytes = base64.b64decode(pair["imageBase64"])
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img_array = np.array(img)

        notes = pair.get("correctedNotes", [])
        frets = [n.get("fret", 0) for n in notes]

        # Check if notes have pixel positions (synthetic data with cx/cy)
        has_positions = all(
            isinstance(n.get("cx"), (int, float)) and isinstance(n.get("cy"), (int, float))
            for n in notes
        ) if notes else False

        if has_positions:
            # Use stored positions directly — no detection needed
            for n in notes:
                digit = n.get("fret", 0)
                if 0 <= digit <= 12:
                    crop = crop_digit(img_array, int(n["cx"]), int(n["cy"]))
                    digit_crops.append(crop)
                    digit_labels.append(digit)

                # Extract label crop if position available
                combined_label = n.get("label", "")
                lcx = n.get("lcx")
                lcy = n.get("lcy")
                if combined_label and lcx is not None and lcy is not None:
                    label_idx = LABEL_TO_IDX.get(combined_label)
                    if label_idx is not None:
                        lcrop = crop_digit(img_array, int(lcx), int(lcy))
                        label_crops.append(lcrop)
                        label_labels.append(label_idx)
            continue

        # Fall back to programmatic detection for real training pairs
        line_ys = detect_staff_lines(img_array)
        if line_ys is None:
            skipped += 1
            continue

        detected = detect_note_positions(img_array, line_ys)

        if len(detected) != len(frets):
            skipped += 1
            continue

        # Crop each digit
        for i, note in enumerate(detected):
            ny = line_ys[note["lineNum"] - 1]
            crop = crop_digit(img_array, note["centerX"], ny)
            digit = frets[i]
            if 0 <= digit <= 12:
                digit_crops.append(crop)
                digit_labels.append(digit)

    if skipped > 0:
        print(f"  Skipped {skipped}/{len(pairs)} pairs (detection mismatch)")

    return digit_crops, digit_labels, label_crops, label_labels


# ── Training ─────────────────────────────────────────────────────────────────

def train(
    crops: list[np.ndarray],
    labels: list[int],
    epochs: int = 30,
    batch_size: int = 64,
    lr: float = 0.001,
    num_classes: int = 13,
) -> TabDigitNet:
    """Train the digit classifier and return the model."""
    n = len(crops)
    print(f"Training on {n} digit crops")

    # Convert to tensors
    X = np.stack(crops).astype(np.float32) / 255.0
    # Invert: dark digits on light bg → white on black (matching browser preprocessing)
    X = 1.0 - X
    X = X.reshape(-1, 1, 32, 32)
    y = np.array(labels, dtype=np.int64)

    # Split 80/10/10
    idx = np.random.permutation(n)
    n_train = int(n * 0.8)
    n_val = int(n * 0.1)

    train_idx = idx[:n_train]
    val_idx = idx[n_train:n_train + n_val]
    test_idx = idx[n_train + n_val:]

    X_train, y_train = torch.tensor(X[train_idx]), torch.tensor(y[train_idx])
    X_val, y_val = torch.tensor(X[val_idx]), torch.tensor(y[val_idx])
    X_test, y_test = torch.tensor(X[test_idx]), torch.tensor(y[test_idx])

    train_ds = TensorDataset(X_train, y_train)
    train_dl = DataLoader(train_ds, batch_size=batch_size, shuffle=True)

    model = TabDigitNet(num_classes=num_classes)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    criterion = nn.CrossEntropyLoss()

    best_val_acc = 0.0
    best_state = None

    for epoch in range(epochs):
        model.train()
        total_loss = 0.0
        for xb, yb in train_dl:
            optimizer.zero_grad()
            out = model(xb)
            loss = criterion(out, yb)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * xb.size(0)

        # Validation
        model.eval()
        with torch.no_grad():
            val_out = model(X_val)
            val_preds = val_out.argmax(dim=1)
            val_acc = (val_preds == y_val).float().mean().item()

        avg_loss = total_loss / len(train_ds)
        print(f"  Epoch {epoch + 1:3d}/{epochs} — loss: {avg_loss:.4f}, val_acc: {val_acc:.3f}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state = {k: v.clone() for k, v in model.state_dict().items()}

    # Restore best model
    if best_state is not None:
        model.load_state_dict(best_state)

    # Test accuracy
    model.eval()
    with torch.no_grad():
        test_out = model(X_test)
        test_preds = test_out.argmax(dim=1)
        test_acc = (test_preds == y_test).float().mean().item()

    print(f"\n  Best val accuracy: {best_val_acc:.3f}")
    print(f"  Test accuracy:     {test_acc:.3f}")
    print(f"  Train/Val/Test split: {len(train_idx)}/{len(val_idx)}/{len(test_idx)}")

    return model


# ── ONNX export ──────────────────────────────────────────────────────────────

def export_onnx(model: TabDigitNet, output_path: str, num_classes: int = 13):
    """Export the trained model to ONNX format."""
    model.eval()
    dummy = torch.randn(1, 1, 32, 32)

    torch.onnx.export(
        model,
        dummy,
        output_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
        opset_version=13,
    )

    # Merge external data into a single file (ONNX Runtime Web can't load split models)
    onnx_model = onnx.load(output_path, load_external_data=True)
    onnx.save_model(onnx_model, output_path, save_as_external_data=False)

    # Clean up stale .data file if it exists
    data_file = Path(output_path + ".data")
    if data_file.exists():
        data_file.unlink()

    # Verify
    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)

    size_kb = Path(output_path).stat().st_size / 1024
    print(f"\n  ONNX model saved to {output_path} ({size_kb:.0f} KB)")


# ── CLI entry point ──────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Train banjo tab digit + label classifiers")
    parser.add_argument("--data", required=True, help="Path to training_export.json")
    parser.add_argument("--epochs", type=int, default=30, help="Training epochs (default: 30)")
    parser.add_argument("--output", default="public/models/digit-classifier.onnx", help="Output digit ONNX path")
    parser.add_argument("--batch-size", type=int, default=64, help="Batch size (default: 64)")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate (default: 0.001)")
    args = parser.parse_args()

    if not Path(args.data).exists():
        print(f"Error: {args.data} not found")
        sys.exit(1)

    from collections import Counter

    print("Loading training data...")
    digit_crops, digit_labels, label_crops, label_labels = load_training_data(args.data)

    # ── Train digit classifier ───────────────────────────────────────────────
    if len(digit_crops) < 20:
        print(f"Error: Only {len(digit_crops)} digit crops found — need at least 20")
        sys.exit(1)

    dist = Counter(digit_labels)
    print(f"  Digit distribution: {dict(sorted(dist.items()))}")

    print("\nTraining digit classifier...")
    digit_model = train(digit_crops, digit_labels, epochs=args.epochs, batch_size=args.batch_size, lr=args.lr)

    print("\nExporting digit model to ONNX...")
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    export_onnx(digit_model, args.output)

    # ── Train label classifier ───────────────────────────────────────────────
    if len(label_crops) >= 20:
        dist2 = Counter(label_labels)
        readable = {LABEL_CLASSES[k]: v for k, v in sorted(dist2.items())}
        print(f"\n  Label distribution: {readable}")

        num_label_classes = len(LABEL_CLASSES)
        print(f"\nTraining label classifier ({num_label_classes} classes)...")
        label_model = train(
            label_crops, label_labels,
            epochs=args.epochs, batch_size=args.batch_size, lr=args.lr,
            num_classes=num_label_classes,
        )

        label_output = str(Path(args.output).parent / "label-classifier.onnx")
        print("\nExporting label model to ONNX...")
        export_onnx(label_model, label_output, num_classes=num_label_classes)
    else:
        print(f"\n  Only {len(label_crops)} label crops found — skipping label classifier (need 20+)")
        print("  Generate synthetic data with the updated generator to include label positions.")

    print("\nDone!")


if __name__ == "__main__":
    main()
