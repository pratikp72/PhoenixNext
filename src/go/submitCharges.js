import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable, observable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {Data} from '../data/go/data';
import {Home} from './home';


class PatientRow{
  constructor(data){
    this.data= data;
    this.date = moment(data.VisitDate).format('MM/DD/YYYY');
    this.displayDetails=false;
    this.details=[];
    this.selected=false;
  }

  select(){
    this.selected = this.selected ? false : true;
  }

  toggleDetails(){
    this.displayDetails = this.displayDetails ? false : true;
  }
}

@inject(helper,http, Data, Home )
export class SubmitCharges {


  @bindable startdatepicker;
  @bindable enddatepicker;
  @observable startdate = moment().format('MM/DD/YYYY');
  @observable enddate = moment().format('MM/DD/YYYY');
  filterTypes=['Pending','Submitted','All'];

  rows=[];
  allSelected=false;
  selectAllString="Select";
  displayFilters=false;
  selectedStatusFilter;
  filterBy='all';

  providers=[];
  selectedProvider=null;


  constructor(helper, http, Data, Home) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
  }

  startdateChanged(newVal, oldVal){
    let self = this;
    if(self.displayFilters){
      self.filter(self.filterBy);
    }
  }

  trySelectLoggedInUser(){
    let self = this;
    //check if logged-in user is a scheduled provider,
    //if so, select it him....
    var userId = self.helper._user.UserID;
    var aProvider = _.find(self.providers, function(p){return p.UserID == userId});
    if(aProvider != undefined){
      //select provider...
      // self.providerSelected();
      self.selectedProvider = aProvider;
    }else{
      // //select ALL...
      self.selectedProvider = self.providers[0];
    }
    self.providerSelected();
  }

  enddateChanged(newVal, oldVal){
    let self = this;
    if(self.displayFilters){
      self.filter(self.filterBy);
    }
  }

  activate(model){
    let self = this;

    self.providers = model.providers;

    self.selectedStatusFilter = self.filterTypes[0];

    self.trySelectLoggedInUser();

    //self.filter(self.filterBy);
  }

  providerSelected(){
    this.filter(this.filterBy);
  }

  toggleFilters(){
    this.displayFilters = this.displayFilters ? false : true;
  }

  filterTypeSelected(t){
    this.selectedStatusFilter = t;
    this.filter(this.filterBy);
  }

  filter(filter){
    this.filterBy = filter;

    if(filter=='date'){
      this.getChargesWithDateRange(this.startdate, this.enddate);
    }else if(filter=='status'){
      this.getChargesWithStatus(this.selectedStatusFilter);
    }else{
      //all
      this.getChargesWithDateRangeAndStatus(this.startdate, this.enddate, this.selectedStatusFilter);
    }
  }

  showDetails(row){
    row.toggleDetails();
    if(row.details.length == 0){
      this.getChargeDetails(row.data.VisitCodeID, function(res){
        row.details = res.Details;
      });
    }
  }

  getChargeDetails(visitId, callback){
    let self = this;
    let detailUrl = `charges/detail?visitId=${visitId}`;
    self.data.getWithUrl(detailUrl, function(detail){
      callback(detail);
    });
  }

  getCharges(){
    let self = this;
    self.rows=[];
    self.data.getWithUrl('charges/all', function(res){
      for(let i = 0; i < res.length; i++){
        let aRow = new PatientRow(res[i]);
        self.rows.push(aRow);
      }
    });
  }

  getChargesWithDateRange(fromDate, toDate){
    let self = this;
    let url = `charges?fromDate=${fromDate}&toDate=${toDate}`;
    self.rows=[];
    self.data.getWithUrl(url, function(res){
      // for(let i = 0; i < res.length; i++){
      //   let aRow = new PatientRow(res[i]);
      //   self.rows.push(aRow);
      // }

      self.addFilterResults(res);
    });
  }

  getChargesWithStatus(status){
    let self = this;
    self.rows=[];

    if(status == 'All'){
      self.getCharges();
    }else {
      let url = `charges?status=${status}`;
      self.data.getWithUrl(url, function(res){
        // for(let i = 0; i < res.length; i++){
        //   let aRow = new PatientRow(res[i]);
        //   self.rows.push(aRow);
        // }
        self.addFilterResults(res);
      });
    }
  }

  getChargesWithDateRangeAndStatus(fromDate, toDate, status){
    let self = this;
    self.rows=[];
    let url = `charges?fromDate=${fromDate}&toDate=${toDate}&status=${status}`;
    self.data.getWithUrl(url, function(res){
      // for(let i = 0; i < res.length; i++){
      //   let aRow = new PatientRow(res[i]);
      //   self.rows.push(aRow);
      // }
      self.addFilterResults(res);
    });
  }

  filterResultsWithSelectedProvider(results){
    let self = this;
    if(self.selectedProvider && self.selectedProvider.ProviderID != 0){
      return _.filter(results, function(p){return p.ProviderName.toLowerCase() == self.selectedProvider.ProviderEntity.toLowerCase()});
    }else{
      return results;
    }
  }

  addFilterResults(results){
    let self = this;

    //filter against selected provider...
    let filtered = self.filterResultsWithSelectedProvider(results);

    for(let i = 0; i < filtered.length; i++){
      let aRow = new PatientRow(filtered[i]);
      self.rows.push(aRow);
    }
  }

  selectAll(){
    this.allSelected = this.allSelected ? false: true;
    this.selectAllString = this.allSelected ? "Deselect" : "Select";
    for(let i = 0; i < this.rows.length; i++){
      this.rows[i].selected = this.allSelected;
    }
  }

  submitChargesClick(){
    let self = this;

    //loop over each row...
    for(let i = 0; i < self.rows.length; i++){

      //only submit checked rows...
      if(!self.rows[i].selected)continue;

      let rData = self.rows[i].data;
      let obj={
        VisitID: rData.VisitCodeID,
        ScheduleID: rData.ScheduleID,
        ForeignScheduleID: rData.ForeignScheduleID,
        ForeignLocationID: rData.ForeignLocationID
      }

      self.data.postWithUrlAndData('charges/submit', JSON.stringify(obj), function(res){
          if(res=='Submitted'){
            //update row status...
            rData.Status = res;
          }else{
            //TODO???
          }
      });
    }
  }


}
