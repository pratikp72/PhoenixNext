import {helper} from '../helpers/helper';
import {inject} from 'aurelia-framework';
import {DialogController} from 'aurelia-dialog';



@inject(helper, DialogController)//,http, Data, Home )
export class Camera {

  dialog;
  showVideo=true;
  imageData=null;
  displaySpinner = true;
  facingUser = true;

  constructor(helper, DialogController){//, http, Data, Home) {
    this.helper = helper;
    this.dialogController = DialogController;
  }

  activate(params) {
    // let self = this;

    // self.dialog = params.dialog;

  }

  attached(){

    var res = $(this.camerapop).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5000", "important");

    this.video.setAttribute('autoplay', '');
    this.video.setAttribute('muted', '');
    this.video.setAttribute('playsinline', '');

    this.setupVideo();
  }

  detached(){
    this.video.srcObject.getTracks().forEach(mediaTrack => {
      mediaTrack.stop();
    });
  }

  flip(){
    let self = this;
    self.displaySpinner = true;
    self.facingUser = self.facingUser ? false : true;

    const options = {
      audio: false,
      video: {
          facingMode: self.facingUser ? 'user' : 'environment', // Or 'environment'
      },
    };
  
    // Stop the tracks
    var stream = self.video.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());

    navigator.mediaDevices.getUserMedia(options)
      .then( MediaStream => {
        // Code that uses the MediaStream
        self.video.srcObject = null;
        self.video.srcObject = MediaStream;
        self.video.play();
        self.displaySpinner = false;
      }).catch( error => {
      // Code to handle the error

      self.displaySpinner = false;
    });
  }

  setupVideo(){
    let self = this;

    const constraints = {
      audio: false,
      video: {
        facingMode: 'user'
      }
    }

    navigator.mediaDevices.getUserMedia(constraints)
      .then( MediaStream => {
        // Code that uses the MediaStream
        self.video.srcObject = MediaStream;
        self.displaySpinner = false;
      }).catch( error => {
      // Code to handle the error

      self.displaySpinner = false;
    });
  }

  take(){
    let self = this;

    self.showVideo = false;

    self.canvas.getContext('2d').drawImage(self.video, 0, 0, self.canvas.width, self.canvas.height);
    self.imageData = self.canvas.toDataURL('image/jpeg');
  }

  clear(){
    this.showVideo = true;
  }

  save(){

    //remove scheme from results...
    // var index = this.imageData.indexOf("base64");
    // var totalLength = this.imageData.length;
    // var startLength = index + 7;
    // var res = this.imageData.substring(startLength, this.imageData.length - startLength);
    // var finalLength = res.length;

    var res = this.imageData.replace('data:image/jpeg;base64,', '');

    this.dialogController.close(true, {image: res});
  }

  cancel(){
    this.dialogController.cancel();
  }



}
