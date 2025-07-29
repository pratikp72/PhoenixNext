import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable, observable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {Data} from '../data/go/data';
import {Home} from './home';


@inject(helper,http, Data, Home)
export class Signature {

  provider;
  ctx;
  drawing = false;
  mousePos = {
    x: 0,
    y: 0
  };
  lastPos;// = mousePos;
  dialog;
  signature;
  userId;

  displayCancelButton=true;
  dontSave = false;


  constructor(helper, http, Data, Home) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
  }

  activate(params) {
    var self = this;

    self.lastPos = self.mousePos;

    if(params.hasOwnProperty("data")){
      self.dialog = params.dialog;
      self.userId = params.data.UserID;
    }else{
      self.userId = params.userId;
    }
    if(params.hasOwnProperty("dialog")){
      self.dialog = params.dialog;
    }
    if(params.hasOwnProperty("options")){
      if(params.options.dontSave){
        this.dontSave = params.options.dontSave;
      }
      if(params.options.displayCancelButton){
        this.displayCancelButton = params.options.displayCancelButton;
      }
    }


    if(typeof self.helper.jwt() === 'undefined' ||
      self.helper.jwt() == null){

      //if we find an API key in the query string
      //we need to re-authenticate to make sure it is still valid
      if (params.hasOwnProperty("jwt")){
        self.helper.processToken(params.jwt);

        self.displayCancelButton = false;//don't need cancel button when launching signature from outside GO

      }
    }
    else{
      //if we already have the apiKey we dont need to authenticate
      //mustAuthenticate = false;
    }

    window.requestAnimFrame = (function(callback) {
      return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimaitonFrame ||
        function(callback) {
          window.setTimeout(callback, 1000 / 60);
        };
    })();

    // self.data.getWithUrl('users/'+ self.userId, function(res){
    //     if(res.OD_Signature){
    //       self.signature = res.OD_Signature;
    //       self.loadSignature(self.signature.Data);
    //     }
    // });
  }

  renderCanvas() {
    let self = this;
    if (self.drawing) {
      self.ctx.moveTo(self.lastPos.x, self.lastPos.y);
      self.ctx.lineTo(self.mousePos.x, self.mousePos.y);
      self.ctx.stroke();
      self.lastPos = self.mousePos;
    }
  }

  getMousePos(canvasDom, mouseEvent) {
    let rect = canvasDom.getBoundingClientRect();
    return {
      x: mouseEvent.clientX - rect.left,
      y: mouseEvent.clientY - rect.top
    }
  }

  getTouchPos(canvasDom, touchEvent) {
    let rect = canvasDom.getBoundingClientRect();
    return {
      x: touchEvent.touches[0].clientX - rect.left,
      y: touchEvent.touches[0].clientY - rect.top
    }
  }

  submit(){
    let self = this;

    if(self.dontSave){
      self.dialog.close(true, self.sigcanvas.toDataURL());
      return;
    }

    if(self.signature == undefined || self.signature.Id == 0){
      //post
      self.data.getWithUrl('signatures/new', function (newSig) {

        newSig.Data = self.sigcanvas.toDataURL();
        newSig.Id = self.userId;

        self.data.postWithUrlAndData('signatures', JSON.stringify(newSig), function(saveRes){

        });

      });
    }else{
      //put
      self.signature.Data = self.sigcanvas.toDataURL();
      self.data.putWithUrlAndData('signatures', self.signature, function(updateRes){

      });
    }
  }

  clear(){
    this.sigcanvas.width = this.sigcanvas.width;
  }

  cancel(){
    this.dialog.cancel();
  }

  attached(){

    let self = this;
    self.ctx = self.sigcanvas.getContext("2d");
    self.ctx.strokeStyle = "#222222";
    self.ctx.lineWidth = 4;

    let uxBody = $('ux-dialog-body');
    if(uxBody.length > 0){
      uxBody[0].style.removeProperty('overflow-y');
    }

    $("body").css("overflow", 'hidden');

    (function drawLoop() {
      requestAnimFrame(drawLoop);
      self.renderCanvas();
    })();

    self.sigcanvas.addEventListener("mousedown", function(e) {
      self.drawing = true;
      self.lastPos = self.getMousePos(self.sigcanvas, e);
    }, false);

    self.sigcanvas.addEventListener("mouseup", function(e) {
      self.drawing = false;
    }, false);

    self.sigcanvas.addEventListener("mousemove", function(e) {
      self.mousePos = self.getMousePos(self.sigcanvas, e);
    }, false);

    self.sigcanvas.addEventListener("touchmove", function(e) {
      var touch = e.touches[0];
      var me = new MouseEvent("mousemove", {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      self.sigcanvas.dispatchEvent(me);
    }, false);

    self.sigcanvas.addEventListener("touchstart", function(e) {
      self.mousePos = self.getTouchPos(self.sigcanvas, e);
      var touch = e.touches[0];
      var me = new MouseEvent("mousedown", {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      self.sigcanvas.dispatchEvent(me);
    }, false);

    self.sigcanvas.addEventListener("touchend", function(e) {
      var me = new MouseEvent("mouseup", {});
      self.sigcanvas.dispatchEvent(me);
    }, false);


    if(self.userId){
      self.data.getWithUrl('users/'+ self.userId, function(res){
        if(res.OD_Signature){
          self.signature = res.OD_Signature;
          self.loadSignature(self.signature.Data);
        }
      });
    }

    // if(self.sigcanvas){
    //   self.sigcanvas.scrollIntoView();
    // }

  }

  loadSignature(data){
    let self = this;
    let ctx = self.sigcanvas.getContext("2d");
    let image = new Image();

    let finalStrData='data:image/';
    //GIF or PNG???
    if(data.substring(0, 6)=='R0lGOD'){
      //GIF
      finalStrData += 'gif;base64,'+data;
    }else{
      //PNG
      finalStrData += 'png;base64,'+data;
    }

    image.src = finalStrData;
    image.onload=function(){
      ctx.drawImage(this, 0, 0, self.sigcanvas.width, self.sigcanvas.height);
    }
  }

}
