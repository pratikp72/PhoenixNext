import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject} from 'aurelia-framework';
import {computedFrom} from 'aurelia-framework';
import moment from 'moment';
import * as _ from 'lodash';


@inject(helper,http)
export class PtAuthData {

  constructor(helper, http){
    this.helper = helper;
    this.http = http;
  }

  getWithPatientId(patientId, callback){
    let self = this;
    let url = "ptauth?patientId=" + patientId;
    self.http.get(self.helper.getApiUrl(url), function(json){
      if (json != null && json.length > 0) {
        callback(json);
      }
    });
  }


  save(authorizations, patientId, userId, callback){
    var self = this;
    var url = "ptauth";

    for(var i = 0; i < authorizations.length; i++){

      var auth = authorizations[i];

      var OD_PT_Auth ={
        "Id": auth.id,
        PostOpId: auth.data ? auth.data.PostOpId : 0,
        BodyPart: auth.part,
        BodySide: auth.side,
        Type: auth.type,
        AuthDays: auth.authDays,
        AuthDate: auth.authDate,
        PatientId: patientId,
        UserId: userId,
        Status: auth.status,
        Comments: auth.comments,
        AuthNumber: auth.authNumber,
        JSON: auth.data ? auth.data.JSON : null,
        ClaimID: auth.caseId
      }


      if(OD_PT_Auth.Id == 0){
        //create board...
        self.http.post(self.helper.getApiUrl(url), JSON.stringify(OD_PT_Auth), function(res){
            if(callback){
              callback(res);
            }
          },
          { contentType: "application/json" },
          function(err){
            var e = 'oops';
          });

      }else{
        //update board...
        self.http.put(self.helper.getApiUrl(url), OD_PT_Auth, (success) => {
          if(callback){
            callback(success);
          }
        }, (error) => {
          alert(error.responseText);
        });
      }

    }
  }

}
