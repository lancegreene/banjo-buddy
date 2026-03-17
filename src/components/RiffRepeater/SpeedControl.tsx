interface Props {
  speed: number       // 50-100
  onSpeedChange: (speed: number) => void
}

export function SpeedControl({ speed, onSpeedChange }: Props) {
  return (
    <div className="speed-control">
      <label className="speed-control-label">
        Speed: {speed}%
      </label>
      <input
        type="range"
        min={50}
        max={100}
        step={5}
        value={speed}
        onChange={e => onSpeedChange(parseInt(e.target.value))}
        className="speed-control-slider"
      />
      <div className="speed-control-marks">
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  )
}
