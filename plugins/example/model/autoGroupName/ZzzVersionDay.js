export function NameCardContent() {
  let Versions = [24, 25, 26, 27, 28, 30, 31, 32, 33, 34]
  let Index = 0
  let baseTime = new Date('2025-12-31 15:00:00').getTime()
  let nowTime = new Date().getTime()
  let duringTime = baseTime - nowTime
  while (duringTime <= 0) {
    duringTime += 42 * 24 * 60 * 60 * 1000
    Index += 1
  }
  let Version = (Number(Versions[Index]) / 10).toFixed(1)
  let days = Math.floor(duringTime / (24 * 3600 * 1000))
  let leave1 = duringTime % (24 * 3600 * 1000)
  let hours = Math.floor(leave1 / (3600 * 1000))
  let leave2 = leave1 % (3600 * 1000)
  let minutes = Math.floor(leave2 / (60 * 1000))
  return `离绝区零${Version}还有${days}天${hours}小时${minutes}分钟`
}
