function LightControl() {
  return (
    <div>
      <button onClick={() => fetch('/api/command', {
        method: 'POST', body: JSON.stringify({
          deviceId: 'light-1',
          command: 'on'
        })
      })}>Turn On</button>
    </div>
  )
}