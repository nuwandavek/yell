from flask import Flask, request, Response, jsonify, render_template
from flask_socketio import SocketIO, emit
from helpers import Yell
import time

app = Flask(__name__, template_folder="./frontend", static_folder="./frontend", static_url_path="")
socketio = SocketIO(app)


def setup_pipeline():
  global yell
  yell = Yell()


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/transcribe', methods=['POST', 'GET'])
def transcribe():
  if request.method == 'POST':
    if 'file' in request.files:
      file = request.files['file']
      if file and file.filename:
        transcription = yell.transcribe_from_bytes(file.read())
        return jsonify(transcription)
    else:
      return Response("Upload error!", status=400)

  elif request.method == 'GET':
    return Response("Send a post request, with the file!")


@socketio.event
def connect():
  print("Socketio Connection established!")
  emit('connect', {'data': 'Connected'})


@socketio.event
def audioStream(message):
  print(f"\n\nAudio received at {time.time()}")
  transcription = yell.transcribe_from_bytes(message['audio'])

  emit('liveTranscription', transcription)


if __name__ == '__main__':
  setup_pipeline()
  socketio.run(app, host="localhost", port=5000, debug=True)
