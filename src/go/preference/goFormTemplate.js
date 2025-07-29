import {inject, bindable, observable} from 'aurelia-framework';
import * as _ from 'lodash';
import {Data} from '../../data/go/data';

@inject(Data)
export class GoFormTemplate {

  section=null;
  selectedPref=null;
  prefList=[];
  providerId;
  bodypart;

  constructor(Data) {
    this.data = Data;
  }

  activate(params) {
    var self = this;
    self.section = params;

    self.providerId = self.section.parent.editor.currentProvider.ProviderID;
    self.bodypart = self.section.parent.editor.selectedBodyPart;

    self.data.getWithUrl(`goforms/pref?providerId=${self.providerId}&tag=${self.bodypart}`, function(prefs){
      self.prefList = prefs;
    });
  }

  addPref(){
    let self = this;

    let proto={
      Id: 0,
      IMapId: self.section.parent.prefId,
      PreferenceId: self.selectedPref.Id,
      TableName: 'OD_Go_Forms_Pref',
      PreferenceIdColumn: 'Id',
      AutoTaskId: null,
      Modifier: null
    }

    let pref={
      id: self.selectedPref.Id,
      name: self.selectedPref.Description,
      details: self.selectedPref.CPTCode,
      data: self.selectedPref,
      imapProtocol: proto
    }

    self.section.items.push(pref);
  }
}
