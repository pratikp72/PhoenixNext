/**
 * Created by montymccune on 11/17/17.
 */

import {inject} from 'aurelia-framework';
import {DatagridHelper} from 'PhxDataGrid/datagridHelper';
import {PtDatagridHelper} from 'ptdaysheet/ptDatagridHelper';

@inject(DatagridHelper,PtDatagridHelper)
export class Access{
  constructor (DatagridHelper,PtDatagridHelper){
    this.datagridHelper = DatagridHelper;
    this.ptdaysheetHelper = PtDatagridHelper;
  }

  loadXrays(patientId, date) {
    this.datagridHelper.getXrays(patientId, date);
  }

  setXrayColumnVisibility(colIndex, visible) {
    this.datagridHelper.setColumnVisibility(colIndex, visible);
  }

  addXrayRows(data, refresh) {
    this.datagridHelper.addRows(data, refresh);
  }

  clearXray(){
    this.datagridHelper.clear();
  }

  removeXrayRowByIndex(index) {
    this.datagridHelper.removeRowByIndex(index);
  }

  updateXrayRowByIndexAndXray(index, xray) {
    this.datagridHelper.updateRowByIndexAndXray(index, xray);
  }

  loadPtDaysheetProviderPref(prefId){
    this.ptdaysheetHelper.selectPreferenceByPrefId(prefId);
    //new change
  }

  updatePtDaysheetBodypart(bodypart){
    this.ptdaysheetHelper.bodyPart = bodypart;
  }

  updatePtDaysheetPref(description, postOpPrefId){
    this.ptdaysheetHelper.updatePreference(description, postOpPrefId);
  }

  saveNewPtDaysheetPref(description, postOpPrefId, bodypart, providerId){
    let self = this;
    self.ptdaysheetHelper.saveNewPreference(description, postOpPrefId, bodypart, providerId, function(pref){
      self.ptdaysheetHelper.createPrefSaveObject(pref.ID, pref.PrefDescription, postOpPrefId, pref.Bodypart, false, function(prefObj){
        let url = 'ptdaysheet/pref';
        self.ptdaysheetHelper.http.post(self.ptdaysheetHelper.helper.getApiUrl(url), prefObj, function (saveRes) {
          //callback(res);

        }, function (err) {
          let e = err;
        });
      })
    });
  }

  savePtDaysheet(){
    return this.ptdaysheetHelper.saveDaysheet();
  }

  testToggleTelemedSchedule(){
    alert("Toggle!");
  }

}


