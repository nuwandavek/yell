import ffmpeg
import numpy as np
import whisper


def load_audio(file):
  try:
    out, _ = (
      ffmpeg.input('pipe:')
      .output("-", format="s16le", acodec="pcm_s16le", ac=1, ar=whisper.audio.SAMPLE_RATE)
      .run(cmd=["ffmpeg", "-nostdin"], capture_stdout=True, capture_stderr=True, input=file)
    )

  except ffmpeg.Error as e:
    raise RuntimeError(f"Failed to load audio: {e.stderr.decode()}") from e

  return np.frombuffer(out, np.int16).flatten().astype(np.float32) / 32768.0


class Yell:
  def __init__(self, model_name="tiny"):
    self.model = whisper.load_model(model_name)

  def transcribe_from_bytes(self, file):
    audio = load_audio(file)
    res = self.model.transcribe(audio, fp16=False)
    return res
