import {bindable} from 'aurelia-framework';
import {bindingMode} from 'aurelia-framework';
import {Home} from './home';
import {inject} from 'aurelia-framework';
import {Globals} from './globals';
//'import {EventAggregator} from 'aurelia-event-aggregator';



@inject(Home, Globals)
export class WebSpeechCustomElement {

  @bindable speechId=null;
  @bindable textArea='';
  @bindable callback = () => {}

  caretPosition =0;
  transcription='';
  enabled = true;

  textAreaChanged(newVal, oldVal) {
    if (newVal) {
      // newVal.filter(fruit => {
      //   return validFruits.indexOf(fruit) >= 0;
      // });
    }
  }


  recognizing = false;
  //ignore_onend;
  //start_timestamp;
  buttonColor="lightgrey";
  //recognition;

  constructor(Home, Globals){
    this.home = Home;
    this.globals = Globals;
    //this.events = EventAggregator;
  }

  attached(){
    this.enabled = window.hasOwnProperty('webkit');
  }

  speechClicked(){
    var self = this;

    if(self.enabled) {
      if (this.recognizing) {
        this.buttonColor = "lightgrey";
        self.stopSpeechIos();
        this.transcription = this.textArea;
        this.caretPosition = this.textArea.length;
        return;
      }else{
        this.buttonColor = "red";

        // if(self.textArea.length > 0){
        //   this.caretPosition = self.textArea.length;
        //   this.transcription = self.textArea;
        // }

        if(this.domtextarea.textLength > 0){
          this.caretPosition = this.domtextarea.textLength;
          this.transcription = this.domtextarea.value;
        }

        if(this.domtextarea.selectionStart > 0){
          this.caretPosition = this.domtextarea.selectionStart;
        }

        self.startSpeechIos();
      }
    }
  }

  startSpeechIos(){
    if(this.enabled){
      this.recognizing = true;
      var msg ={'status': 'start', 'id': this.speechId}
      webkit.messageHandlers.dictation.postMessage(msg);
    }
  }

  stopSpeechIos(){
    if(this.enabled){
      this.recognizing = false;
      var msg ={'status': 'stop', 'id': this.speechId}
      webkit.messageHandlers.dictation.postMessage(msg);
    }
  }

  transcriptionResult(text){

    var txt = '';

    //beginning, middle or end???
    if(this.caretPosition == 0){
      //beginining...
      txt = text;
    }else if(this.caretPosition > 0 && this.caretPosition < this.transcription.length){
      //middle...
      var start = this.transcription.substr(0, this.caretPosition);
      var end = this.transcription.substr(this.caretPosition, this.transcription.length - this.caretPosition);
      txt = start.concat(text, end);

    }else {
      //end...
      var beginning = this.transcription.substr(0, this.caretPosition);
      beginning = beginning.concat(" ");
      txt = beginning.concat(text);
    }

    this.textArea = txt;
  }


  blurred(){
    this.callback();
  }

  // startButton(event) {
  //   if (this.recognizing) {
  //     this.buttonColor="lightgrey";
  //     this.recognition.stop();
  //     return;
  //   }
  //
  //   this.buttonColor = "red";
  //
  //
  //
  //   // this.recognition.lang = 'en-US';//select_dialect.value;
  //   // this.recognition.start();
  //   // this.ignore_onend = false;
  //
  //   //start_img.src = '/intl/en/chrome/assets/common/images/content/mic-slash.gif';
  //   // showInfo('info_allow');
  //   // showButtons('none');
  //   //this.start_timestamp = event.timeStamp;
  // }


  setupSpeech(){

    var self = this;

    if (!('webkitSpeechRecognition' in window)) {
      upgrade();
    } else {
      // start_button.style.display = 'inline-block';
      this.recognition = new webkitSpeechRecognition();

      //this.recognition = new SpeechRecognition() || new webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onstart = function() {
        self.recognizing = true;
        //showInfo('info_speak_now');
        //start_img.src = '/intl/en/chrome/assets/common/images/content/mic-animate.gif';
      };

      this.recognition.onerror = function(event) {
        if (event.error == 'no-speech') {
          // start_img.src = '/intl/en/chrome/assets/common/images/content/mic.gif';
          //showInfo('info_no_speech');
          self.ignore_onend = true;
        }
        if (event.error == 'audio-capture') {
          //start_img.src = '/intl/en/chrome/assets/common/images/content/mic.gif';
          // showInfo('info_no_microphone');
          self.ignore_onend = true;
        }
        if (event.error == 'not-allowed') {
          if (event.timeStamp - self.start_timestamp < 100) {
            //showInfo('info_blocked');
          } else {
            //showInfo('info_denied');
          }
          self.ignore_onend = true;
        }
      };

      this.recognition.onend = function() {
        self.recognizing = false;
        if (self.ignore_onend) {
          return;
        }
        //start_img.src = '/intl/en/chrome/assets/common/images/content/mic.gif';
        if (!self.textArea) {
          //showInfo('info_start');
          return;
        }
        //showInfo('');
        // if (window.getSelection) {
        //   window.getSelection().removeAllRanges();
        //   var range = document.createRange();
        //   range.selectNode(self.textRef);
        //   window.getSelection().addRange(range);
        // }

      };

      this.recognition.onresult = function(event) {
        var interim_transcript = '';
        if (typeof(event.results) == 'undefined') {
          self.recognition.onend = null;
          self.recognition.stop();
          //upgrade();
          return;
        }
        for (var i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            self.textArea += event.results[i][0].transcript;
          } else {
            interim_transcript += event.results[i][0].transcript;
          }
        }
        self.textArea = self.capitalize(self.textArea);
        self.textArea = self.linebreak(self.textArea);
        // interim_span.innerHTML = linebreak(interim_transcript);
        // if (textArea || interim_transcript) {
        //   showButtons('inline-block');
        // }
      };
    }
  }

  two_line = /\n\n/g;
  one_line = /\n/g;
  linebreak(s) {
    return s.replace(this.two_line, '<p></p>').replace(this.one_line, '<br>');
  }

  first_char = /\S/;
  capitalize(s) {
    return s.replace(this.first_char, function(m) { return m.toUpperCase(); });
  }




}



