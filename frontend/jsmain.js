let recentAudioBlob = null;
let socket = null
const LIVE_INTERVAL = 5000;

const audioRecorder = {
  audioBlobs: [],
  mediaRecorder: null,
  stream: null,
  start: function () {
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      return Promise.reject(new Error('mediaDevices API or getUserMedia method is not supported in this browser.'));
    }
    else {
      return navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          audioRecorder.stream = stream;
          audioRecorder.mediaRecorder = new MediaRecorder(stream);
          audioRecorder.audioBlobs = [];
          audioRecorder.mediaRecorder.addEventListener("dataavailable", event => {
            audioRecorder.audioBlobs.push(event.data);
          });
          audioRecorder.mediaRecorder.start();
        });

    }
  },
  stop: function () {
    return new Promise(resolve => {
      let mimeType = audioRecorder.mediaRecorder.mimeType;
      audioRecorder.mediaRecorder.addEventListener("stop", () => {
        let audioBlob = new Blob(audioRecorder.audioBlobs, { type: mimeType });
        let audioUrl = URL.createObjectURL(audioBlob);
        resolve({audioBlob, audioUrl});
      });
      audioRecorder.mediaRecorder.stop();
      audioRecorder.stopStream();
      audioRecorder.resetRecordingProperties();
    });
  },
  liveStreamLoop: function() {
    return new Promise(resolve => {
      let mimeType = audioRecorder.mediaRecorder.mimeType;
      audioRecorder.mediaRecorder.requestData();
      let audioBlob = null;
      if (audioRecorder.audioBlobs.length > 0){
         audioBlob = new Blob(audioRecorder.audioBlobs, { type: mimeType });
      }
      resolve({audioBlob});
    });
  },
  stopStream: function() {
    audioRecorder.stream.getTracks().forEach(track => track.stop());
  },
  resetRecordingProperties: function () {
    audioRecorder.mediaRecorder = null;
    audioRecorder.stream = null;
  },
  cancel: function () {
    audioRecorder.mediaRecorder.stop();
    audioRecorder.stopStream();
    audioRecorder.resetRecordingProperties();
  },
}

function getTranscription(audio){
  if(audio){
    let formData = new FormData();
    $("#spinny").show();
    formData.append("file", audio);
    fetch('/transcribe', {method: "POST", body: formData})
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      $("#spinny").hide();
      $("#transcription-result").text(data.text.trim());
    });
  }
}

function setupTranscriptionMethod1(){
  $("#transcribe-1").click(()=>{
    let audio = ($("#actionfileinput")[0]).files[0];
    getTranscription(audio)
  });
}

function setupTranscriptionMethod2(){
  $("#transcribe-2").click(()=>{
    let audio = recentAudioBlob;
    getTranscription(audio)
  });
  
  $("#record-start").click(()=>{
    $("#record-start").addClass('disabled');
    $("#record-text").text('Recording...');
    $(".record-actions").removeClass('disabled');

    audioRecorder.start()
      .then(() => { console.log("Recording Audio...")})    
      .catch(error =>  console.log(error));     
  })
  function cancelStop(){
    $("#record-start").removeClass('disabled');
    $("#record-text").text('Record');
    $(".record-actions").addClass('disabled');
  }
  $("#record-done").click(()=>{
    cancelStop();
    audioRecorder.stop()
      .then( audio => {
        console.log("stopped with audio Blob:", audio.audioblob);
        console.log("stopped with audio url:", audio.audioUrl);
        $("#recorded-audio-src").attr("src", audio.audioUrl);
        $("#recorded-audio")[0].pause();
        $("#recorded-audio")[0].load();
        $("#recorded-audio")[0].play();
        recentAudioBlob = audio.audioBlob;
      })
      .catch(error => console.log(Error));
          
  })

  $("#record-cancel").click(()=>{
    cancelStop();
    audioRecorder.cancel();
  })
}

function setupTranscriptionMethod3(){
  let setIntervalId = null;
  socket.on('liveTranscription', function(data) {
    console.log(data);
    $("#transcription-text").text(data.text.trim());

  });

  $("#transcribe-3").click(()=>{
    $("#transcribe-3").addClass('disabled');
    $("#transcribe-3-stop").removeClass('disabled');
    $("#blinker").show();
    $("#transcription-text").text("");
    audioRecorder.start()
      .then(() => { console.log("Recording Audio...")})    
      .catch(error =>  console.log(error));
    setIntervalId = setInterval(streamAudio, LIVE_INTERVAL)

  });

  $("#transcribe-3-stop").click(()=>{
    $("#transcribe-3").removeClass('disabled');
    $("#transcribe-3-stop").addClass('disabled');
    $("#blinker").hide();
    audioRecorder.stop()
      .then( (audio) => {
        clearInterval(setIntervalId);
        console.log("Recording stopped!");
        if (audio.audioBlob){
          console.log("Sending blob at "+Date.now());
          socket.emit('audioStream', {audio: audio.audioBlob});
        }
      })
      .catch(error =>  console.log(error));
  });
}

function streamAudio(){
  audioRecorder.liveStreamLoop()
      .then(audio => {
        console.log(audio.audioBlob);
        if (audio.audioBlob){
          console.log("Sending blob at "+Date.now());
          socket.emit('audioStream', {audio: audio.audioBlob});
        }
      })    
      .catch(error =>  console.log(error));
}

window.onload = function initStuff() {
  console.log("Yell!");
  socket = io();
  socket.on('connect', function(d) {
    console.log('Socketio Connected!', d);
  });
  setupTranscriptionMethod1();
  setupTranscriptionMethod2();
  setupTranscriptionMethod3();
}
