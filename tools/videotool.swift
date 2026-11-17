// ffmpeg 없이 macOS 기본 AVFoundation으로 영상을 처리하는 도구.
// 사용법:
//   swift tools/videotool.swift info    <입력.mp4>
//   swift tools/videotool.swift analyze <입력.mp4>                 # 프레임별 밝기/색 → 급변 지점 리포트
//   swift tools/videotool.swift encode  <입력> <출력> <너비> <kbps>  # 무음, 모든 프레임 키프레임(H.264, 4:2:0)
//   swift tools/videotool.swift poster  <입력> <출력.jpg> [초]       # 정지 이미지 추출
import AVFoundation
import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers

func fail(_ m: String) -> Never { FileHandle.standardError.write((m + "\n").data(using: .utf8)!); exit(1) }

let args = CommandLine.arguments
guard args.count >= 3 else { fail("usage: info|analyze|encode|poster <input> ...") }
let cmd = args[1]
let input = URL(fileURLWithPath: args[2])
let asset = AVURLAsset(url: input)

func videoTrack() async throws -> AVAssetTrack {
  guard let t = try await asset.loadTracks(withMediaType: .video).first else { fail("no video track") }
  return t
}

func info() async throws {
  let t = try await videoTrack()
  let d = try await asset.load(.duration).seconds
  let size = try await t.load(.naturalSize)
  let fps = try await t.load(.nominalFrameRate)
  let rate = try await t.load(.estimatedDataRate)
  let audio = try await asset.loadTracks(withMediaType: .audio).count
  let bytes = (try? FileManager.default.attributesOfItem(atPath: input.path)[.size] as? Int) ?? 0
  print(String(format: "duration %.3fs  size %dx%d  fps %.3f  video %.0f kbps  audio tracks %d  file %.2f MB",
               d, Int(size.width), Int(size.height), fps, rate / 1000, audio, Double(bytes) / 1_048_576))
}

// 프레임마다 평균 R,G,B,루마를 계산해 인접 프레임 간 변화량이 큰 지점을 찾는다.
func analyze() async throws {
  let t = try await videoTrack()
  let fps = Double(try await t.load(.nominalFrameRate))
  let reader = try AVAssetReader(asset: asset)
  let out = AVAssetReaderTrackOutput(track: t, outputSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
  ])
  reader.add(out)
  reader.startReading()
  var rows: [(t: Double, r: Double, g: Double, b: Double, y: Double)] = []
  while let sb = out.copyNextSampleBuffer(), let pb = CMSampleBufferGetImageBuffer(sb) {
    let ts = CMSampleBufferGetPresentationTimeStamp(sb).seconds
    CVPixelBufferLockBaseAddress(pb, .readOnly)
    let w = CVPixelBufferGetWidth(pb), h = CVPixelBufferGetHeight(pb), bpr = CVPixelBufferGetBytesPerRow(pb)
    let p = CVPixelBufferGetBaseAddress(pb)!.assumingMemoryBound(to: UInt8.self)
    var r = 0.0, g = 0.0, b = 0.0, n = 0.0
    var yy = 0
    while yy < h { var xx = 0
      while xx < w { let o = yy * bpr + xx * 4
        b += Double(p[o]); g += Double(p[o + 1]); r += Double(p[o + 2]); n += 1; xx += 4 }
      yy += 4 }
    CVPixelBufferUnlockBaseAddress(pb, .readOnly)
    r /= n; g /= n; b /= n
    rows.append((ts, r, g, b, 0.2126 * r + 0.7152 * g + 0.0722 * b))
  }
  print(String(format: "frames %d  (fps %.2f)", rows.count, fps))
  var diffs: [(i: Int, d: Double)] = []
  for i in 1..<rows.count {
    let a = rows[i - 1], c = rows[i]
    diffs.append((i, abs(c.r - a.r) + abs(c.g - a.g) + abs(c.b - a.b)))
  }
  let mean = diffs.map(\.d).reduce(0, +) / Double(diffs.count)
  print(String(format: "평균 프레임 간 RGB 변화: %.2f (0~765)", mean))
  print("변화가 가장 큰 지점 Top 8:")
  for d in diffs.sorted(by: { $0.d > $1.d }).prefix(8) {
    let a = rows[d.i - 1], c = rows[d.i]
    print(String(format: "  %6.3fs  ΔRGB %6.2f (평균의 %4.1f배)  루마 %5.1f → %5.1f  RGB(%.0f,%.0f,%.0f)→(%.0f,%.0f,%.0f)",
                 c.t, d.d, d.d / mean, a.y, c.y, a.r, a.g, a.b, c.r, c.g, c.b))
  }
  print("1초 단위 평균 루마/RGB:")
  var sec = 0
  while Double(sec) < (rows.last?.t ?? 0) {
    let s = rows.filter { $0.t >= Double(sec) && $0.t < Double(sec + 1) }
    if !s.isEmpty {
      let k = Double(s.count)
      print(String(format: "  %2d-%2ds  루마 %5.1f  RGB(%3.0f,%3.0f,%3.0f)", sec, sec + 1,
                   s.map(\.y).reduce(0, +) / k, s.map(\.r).reduce(0, +) / k,
                   s.map(\.g).reduce(0, +) / k, s.map(\.b).reduce(0, +) / k))
    }
    sec += 1
  }
}

func encode() async throws {
  guard args.count >= 6, let width = Int(args[4]), let kbps = Int(args[5]) else { fail("encode <in> <out> <width> <kbps>") }
  let output = URL(fileURLWithPath: args[3])
  try? FileManager.default.removeItem(at: output)
  let t = try await videoTrack()
  let natural = try await t.load(.naturalSize)
  let fps = try await t.load(.nominalFrameRate)
  var height = Int((Double(width) * Double(natural.height) / Double(natural.width)).rounded())
  height -= height % 2

  let reader = try AVAssetReader(asset: asset)
  let comp = AVMutableVideoComposition(propertiesOf: asset)
  comp.renderSize = CGSize(width: width, height: height)
  let instr = AVMutableVideoCompositionInstruction()
  instr.timeRange = CMTimeRange(start: .zero, duration: try await asset.load(.duration))
  let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: t)
  let s = Double(width) / Double(natural.width)
  layer.setTransform(CGAffineTransform(scaleX: s, y: s), at: .zero)
  instr.layerInstructions = [layer]
  comp.instructions = [instr]
  let out = AVAssetReaderVideoCompositionOutput(videoTracks: [t], videoSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange,
  ])
  out.videoComposition = comp
  reader.add(out)

  let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
  writer.shouldOptimizeForNetworkUse = true // moov 앞쪽 배치(= ffmpeg -movflags +faststart)
  let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
      AVVideoAverageBitRateKey: kbps * 1000,
      AVVideoMaxKeyFrameIntervalKey: 1, // = ffmpeg -g 1 (모든 프레임 키프레임)
      AVVideoAllowFrameReorderingKey: false, // B프레임 없음
      AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
      AVVideoExpectedSourceFrameRateKey: fps,
    ],
  ])
  input.expectsMediaDataInRealTime = false
  writer.add(input) // 오디오 트랙은 추가하지 않음(= -an)
  reader.startReading()
  writer.startWriting()
  writer.startSession(atSourceTime: .zero)
  while let sb = out.copyNextSampleBuffer() {
    while !input.isReadyForMoreMediaData { usleep(2000) }
    input.append(sb)
  }
  input.markAsFinished()
  await writer.finishWriting()
  if writer.status != .completed { fail("encode failed: \(String(describing: writer.error))") }
  let bytes = (try FileManager.default.attributesOfItem(atPath: output.path)[.size] as? Int) ?? 0
  print(String(format: "%@  %dx%d  %d kbps  → %.2f MB", output.lastPathComponent, width, height, kbps, Double(bytes) / 1_048_576))
}

func poster() async throws {
  guard args.count >= 4 else { fail("poster <in> <out.jpg> [sec]") }
  let sec = args.count >= 5 ? Double(args[4]) ?? 0 : 0
  let gen = AVAssetImageGenerator(asset: asset)
  gen.appliesPreferredTrackTransform = true
  gen.requestedTimeToleranceBefore = .zero
  gen.requestedTimeToleranceAfter = .zero
  let (img, _) = try await gen.image(at: CMTime(seconds: sec, preferredTimescale: 600))
  let url = URL(fileURLWithPath: args[3]) as CFURL
  guard let dest = CGImageDestinationCreateWithURL(url, UTType.jpeg.identifier as CFString, 1, nil) else { fail("jpeg") }
  CGImageDestinationAddImage(dest, img, [kCGImageDestinationLossyCompressionQuality: 0.82] as CFDictionary)
  CGImageDestinationFinalize(dest)
  print("poster → \(args[3])")
}

switch cmd {
case "info": try await info()
case "analyze": try await analyze()
case "encode": try await encode()
case "poster": try await poster()
default: fail("unknown command \(cmd)")
}
