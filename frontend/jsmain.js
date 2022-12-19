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

window.onload = function initStuff() {
  console.log("Yell!");
  let recentAudioBlob = null;

  $("#transcribe-1").click(()=>{
    $("#spinny").show();
    let audio = ($("#actionfileinput")[0]).files[0];
    let formData = new FormData();
    
    formData.append("file", audio);
    fetch('/transcribe', {method: "POST", body: formData})
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      $("#spinny").hide();
      $("#transcription-result").text(data.text.trim());
    });
  });

  $("#transcribe-2").click(()=>{
    $("#spinny").show();
    let audio = recentAudioBlob;
    let formData = new FormData();
    
    formData.append("file", audio);
    fetch('/transcribe', {method: "POST", body: formData})
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      $("#spinny").hide();
      $("#transcription-result").text(data.text.trim());
    });
  });
  
  $("#record-start").click(()=>{
    $("#record-start").addClass('disabled');
    $(".record-actions").removeClass('disabled');

    audioRecorder.start()
      .then(() => { console.log("Recording Audio...")})    
      .catch(error =>  console.log(error));     
  })

  $("#record-done").click(()=>{
    $("#record-start").removeClass('disabled');
    $(".record-actions").addClass('disabled');
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
    $("#record-start").removeClass('disabled');
    $(".record-actions").addClass('disabled');
    audioRecorder.cancel();
  })
}
