import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable, observable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment, { relativeTimeThreshold } from 'moment';
import {Data} from '../data/go/data';
import {Home} from './home';
import {EventAggregator} from 'aurelia-event-aggregator';
import {PopupHelper} from "./popupHelper";

class ListObject{
  constructor(description, data){
    this.description=description;
    this.data = data;
  }
}

@inject(helper,http, Data, Home, EventAggregator, PopupHelper )
export class Demographics {


  demographicsVisible = false;
  visitsVisible = true;
  pastHistoryVisible = false;
  @observable filesVisible= false;
  filesVisibleChanged(newVal, oldVal){
    let self = this;
    if(!newVal && oldVal){
      //if newVal is FALSE and oldVal is TRUE...
      //if the files were visible, now closed...
      this.event.publish("fileFolderClosed");
    }else{
      this.event.publish("fileFolderOpened", self.patient.data.PatientID);
    }
  }
  patientAlertVisible=false;
  patient = null;

  @observable currentWidth;
  minWidth;
  maxWidth;
  fullscreen=false;

  home=null;

  sexList=['M','F','UNK'];
  marriedList=['Married','Single','Divorced','Separated','Widowed'];
  stateList=['AK', 'AL', 'AR', 'AS', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'GU', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MP', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UM', 'UT', 'VA', 'VI', 'VT', 'WA', 'WI', 'WV', 'WY'];
  // raceRollupNames=[];
  // ethnicityRollupNames=[];

  raceList=['Hispanic or Latino','Not Hispanic or Latino', 'Patient Declined Race'];
  ethnicityList=['Unknown','Asian Indian or Alaskan', 'Asian', 'Black or African American', 'Declined', 'Native Hawaiian or Other Pacific Islander', 'White'];

  sexPrefs=[];
  genderIds=[];
  languages=[];

  races=[];
  ethnicities=[];

  providerList=[];

  referringProvider;
  primaryCareProvider;
  selectedLanguage;
  selectedRace;
  selectedEthnicity;
  selectedSexualPref;
  selectedGenderID;

  scrollHeight;

  muDemographics;

  disableDemographics = false;


  constructor(helper, http, Data, Home, EventAggregator, PopupHelper) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.event = EventAggregator;
    this.popupHelper = PopupHelper;
  }

  openCamera(){
    let self = this;
    this.popupHelper.openCameraPop(function(imgStr){

      let obj={
        imageString: imgStr.image,
        patientId: self.patient.data.PatientID
      }

      self.data.postWithUrlAndData('patients/photo', JSON.stringify(obj), function(res){
          if(res==true){
            //YAY
            //set patient photo...
            // var imagePath = self.data.admin.GoServerUrl + '/images/Photos/' + self.patient.data.PatientID + '.jpg';
            var imgName = self.patient.data.PatientID + '.jpg';
            var imagePath = self.helper.imageTenantBaseUrl + 'Photos/' + imgName;
            self.home.patient.imagepath = imagePath;
            self.patient.data.Photo = imgName;

            //return goServerUrl + `${imageRoot}/images/Photos/${patient.Photo}`;

          }else{
            //uh-oh
          }
      });

    });
  }

  //testing image capture...
  showImage = false
  takePhoto(){
    let self = this;
    self.showImage = true;
    self.getVideo();
    // self.video.addEventListener('canplay', paintToCanvas);

    // // played the sound
    // snap.currentTime = 0;
    // snap.play();

    // take the data out of the canvas
    // const data = self.canvas.toDataURL('image/jpeg');
    // const link = document.createElement('a');
    // link.href = data;
    // link.setAttribute('download', 'handsome');
    // link.innerHTML = `<img src="${data}" alt="Handsome Man" />`;
    // self.imagecontainer.insertBefore(link, self.imagecontainer.firstChild);
    
  }

  snap(){
    let self = this;
    // take the data out of the canvas
    const data = self.canvas.toDataURL('image/jpeg');
    const link = document.createElement('a');
    link.href = data;
    link.setAttribute('download', 'handsome');
    link.innerHTML = `<img src="${data}" alt="Handsome Man" />`;
    self.imagecontainer.insertBefore(link, self.imagecontainer.firstChild);
  }

  getVideo() {
    let self = this;
    navigator.mediaDevices.getUserMedia({video: true})
      .then(localMediaStream => {
        console.log(localMediaStream);
      
        console.dir(self.video);
        if ('srcObject' in self.video) {
          self.video.srcObject = localMediaStream;
        } else {
          self.video.src = URL.createObjectURL(localMediaStream);
        }

        self.video.addEventListener('canplay', self.paintToCanvas);

        self.video.play();

        self.snap();
      })
      .catch(err => {
        console.error(`OH NO!!!!`, err);
      });
  }
  
  paintToCanvas() {
    let self = this;
    const width = self.videoWidth;
    const height = self.videoHeight;
    self.canvas.width = width;
    self.canvas.height = height;

    var ctx = self.canvas.getContext('2d');
  
    return setInterval(() => {
      ctx.drawImage(self, 0, 0, width, height);
    }, 16);
  }
  



  activate(model){
    let self = this;
    self.visitsVisible = true;
    self.patient = model.patient;
    self.home = model;

    self.disableDemographics = self.home.demographicsDisabled;

    self.event.subscribe('showDemographicsFiles', function(patient){

      // if(self.patient.data.PatientID != patientId){
      //   //reload demographics...
      // }

      self.patient = patient;

      self.toggleNavigation("files");
      self.event.publish('loadPatientFileFolder', patient.data.PatientID);
    })
  }

  attached(){
    this.currentWidth = 600;
    this.minWidth = this.currentWidth;
    this.maxWidth = window.innerWidth;
    //this.scrollHeight = window.innerHeight - 32;
    // this.scrollHeight = this.scrollParentDiv.clientHeight;
  }

  toggleFullscreen(){
    this.fullscreen = this.fullscreen ? false : true;
    this.currentWidth = this.fullscreen ? this.maxWidth : this.minWidth;
  }

  photoClick(){
    this.home.hideDemographics();
  }

  toggleNavigation(nav){
    let self = this;
    if(nav == 'demographics'){
      self.currentWidth = 600;
      self.demographicsVisible = true;
      self.visitsVisible = false;
      self.pastHistoryVisible = false;
      self.filesVisible = false;
      self.scrollHeight = self.demo.clientHeight;
      self.patientAlertVisible = false;
    }else if(nav == 'visits'){
      self.currentWidth = 600;
      self.demographicsVisible = false;
      self.visitsVisible = true;
      self.pastHistoryVisible = false;
      self.filesVisible = false;
      self.patientAlertVisible = false;
    }else if(nav == 'history'){
      //past history...
      self.currentWidth = 950;
      self.demographicsVisible = false;
      self.visitsVisible = false;
      self.pastHistoryVisible = true;
      self.filesVisible = false;
      self.patientAlertVisible = false;
    }else if(nav == 'files'){
      //files...
      var fileWidth = (window.innerWidth / 2) - 72;//sidebar width
      self.currentWidth = fileWidth;//500;
      self.demographicsVisible = false;
      self.visitsVisible = false;
      self.pastHistoryVisible = false;
      self.patientAlertVisible = false;
      self.filesVisible = true;
    }else{
      //alert...
      self.currentWidth = 600;
      self.demographicsVisible = false;
      self.visitsVisible = false;
      self.pastHistoryVisible = false;
      self.filesVisible = false;
      self.patientAlertVisible = true;
    }
  }

}
