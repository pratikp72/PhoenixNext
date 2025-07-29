import {inject, bindable} from 'aurelia-framework';
import { formhelper } from '../formhelper';


@inject(formhelper)
export class ColorPicker {
  @bindable color;
  @bindable left;
  @bindable top;
  @bindable visible;
  hueInput;
  // saturationInput;
  //color;
  hueValue=50;
  saturationValue=100;
  lightnessValue=50;
  alphaValue=1;

  constructor(formhelper) {
    this.formHelper = formhelper;
  }

  hidePopup(){
    this.visible =false;
    //this.addSwatch(this.color);
  }

  addFav(){
    this.addSwatch(this.color);
  }

  activate(model){
    this.item = model;
  }

  attached() {
    this.setDefaultState();
    this.updateColorPicker();
  }

  swatchClicked(s){
    this.color = s;
    this.updateColorPicker();
  }

  addSwatch(color){
    this.formHelper.swatches.push(color);
  }

  setHue() {
    this.hueValue = this.hueInput.value;
    this.color= this.HSLToHex(this.hueValue, this.saturationValue, this.lightnessValue, this.alphaValue);
    this.updateColorPicker();
  }

  setDefaultState() {
    this.hueInput.focus();
    this.setHue();
  }

  colorPickerClick(e){
    var canvas = this.colorCanvas;
    var ctx = this.colorCanvas.getContext('2d');
    var imgData = ctx.getImageData((e.offsetX / canvas.clientWidth) * canvas.width, (e.offsetY / canvas.clientHeight) * canvas.height, 1, 1)
    var rgba = imgData.data;
    this.color = this.RGBToHex(rgba[0],rgba[1],rgba[2]);
  }

  addFavorite(){

  }

  updateColorPicker() {
    var canvas = this.colorCanvas;
    var canvasContext = canvas.getContext('2d');
  
    //hue color...
    let gradient = canvasContext.createLinearGradient(canvas.width, 0, 0, 0);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, 'rgb(255, 255, 255)');
    canvasContext.fillStyle = gradient;
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);

    //black...
    gradient = canvasContext.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
    canvasContext.fillStyle = gradient
    canvasContext.fillRect(0, 0, canvas.width, canvas.height)
  }
  
  RGBToHex(r,g,b) {
    r = r.toString(16);
    g = g.toString(16);
    b = b.toString(16);
  
    if (r.length == 1)
      r = "0" + r;
    if (g.length == 1)
      g = "0" + g;
    if (b.length == 1)
      b = "0" + b;
  
    return "#" + r + g + b;
  }

  HSLToHex(h,s,l,a) {
    s /= 100;
    l /= 100;
  
    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs((h / 60) % 2 - 1)),
        m = l - c/2,
        r = 0,
        g = 0, 
        b = 0; 
  
    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }
    // Having obtained RGB, convert channels to hex
    r = Math.round((r + m) * 255).toString(16);
    g = Math.round((g + m) * 255).toString(16);
    b = Math.round((b + m) * 255).toString(16);
  
    // // Prepend 0s, if necessary
    // if (r.length == 1)
    //   r = "0" + r;
    // if (g.length == 1)
    //   g = "0" + g;
    // if (b.length == 1)
    //   b = "0" + b;
  
    // return "#" + r + g + b;


    a = Math.round(a * 255).toString(16);

    if (r.length == 1)
      r = "0" + r;
    if (g.length == 1)
      g = "0" + g;
    if (b.length == 1)
      b = "0" + b;
    if (a.length == 1)
      a = "0" + a;
  
    return "#" + r + g + b + a;

  }

}
