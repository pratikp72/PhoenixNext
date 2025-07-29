
import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {DialogService} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {Login} from "../login/login";

@inject(helper, http, DialogService)
export class ProcedureMapper {

    constructor(helper, http, DialogService) {
        this.helper = helper;
        this.http = http;
        this.dialogService = DialogService;
        this.message = 'PROCEDURE MAPPER!!';
        this.allListCombos = [];
        this.procedures = [];
        this.needsLogin = false;
        this.selectedProc = null;
        this.procSearchTerm = '';
        this.procError = null;
        this.listComboSearchTerm = '';
        this.selectedModality = 'Select a Modality';
        this.mappings = [];
        this.selectedMapping = null;
        this.mode = '';
    }

    searchListCombos(){
        let self = this;
        self.http.get(self.helper.getApiUrl(`listcombo/search?pageSize=5&searchTerm=${self.listComboSearchTerm}&category=modalities%2Cexercise`), (data) => {
            self.allListCombos = data;
            console.log('LIST COMBOS', data);
        });
    }

    searchProcedures(){
        let self = this;
        self.http.get(self.helper.getApiUrl(`procedures/autocomplete?pageSize=5&searchTerm=${self.procSearchTerm}`), (data) => {
            self.procedures = data;
            self.procError = null;
            console.log('PROCEDURES!', self.procedures);
        });
    }

    getMappings(){
        let self = this;
        self.http.get(self.helper.getApiUrl(`mapping?type=PROCEDURE-MAPPER`), (data) => {
            self.mappings = data;
            console.log('MAPPINGS!', self.mappings);
        });
    }

    toggleAddMode() {
        this.mode = this.mode === 'add' ? '' : 'add';
        this.procError = null;
    }

    changeMode(newMode){
        let self = this;
        if(self.mode === 'edit'){
            self.mappingSelected(null);
        }
        self.mode = newMode;
        self.procError = null;
    }

    mappingSelected(mapping){
        let self = this;
        if(self.selectedMapping === mapping || !mapping){
            self.selectedMapping = null;
        } else {
            self.selectedMapping = mapping;
        }
        if(self.selectedMapping){
            self.mode = 'edit';
        } else {
            self.mode = '';
        }
    }

    deleteMapping(){
        let self = this;
        let mappingId = self.selectedMapping.Id;
        self.http.del(self.helper.getApiUrl(`mapping?id=${mappingId}`), (data) => {
            console.log('MAPPING DELETED SUCCESSFULLY!', data);
            self.mode = '';
            self.getMappings();
        });
    }

    saveMapping(){
        let self = this;

        if(!self.selectedProc) {
            self.procSearchTerm = '';
            self.procError = 'You must select a procedure from the search results.';
            return;
        }

        let modInList = false;
        for(let i = 0; i < self.allListCombos.length; i++){
            let currentListCombo = self.allListCombos[i];

            if(!currentListCombo){
                continue;
            }
            if(currentListCombo.Description1 === self.listComboSearchTerm){
                modInList = true;
                break;
            }
        }

        if(!modInList){
            self.listComboSearchTerm = '';
            self.procError = 'You must select a modality from the search results.';
            return;
        }

        let mapping = {
            Type: "PROCEDURE-MAPPER",
            FromValue: self.listComboSearchTerm,
            ToValue: self.procSearchTerm,
            ToId: self.selectedProc.ProcedureID
        };
        let mappingString = JSON.stringify(mapping);
        console.log('POST DATA', mappingString);
        self.http.post(self.helper.getApiUrl('mapping'), mappingString, (data) => {
            console.log('MAPPING SAVED SUCCESSFULLY!', data);
            self.mode = '';
            self.listComboSearchTerm = '';
            self.procSearchTerm = '';
            self.selectedProc = null;
            self.procError = null;
            self.getMappings();
        }, {contentType: 'application/json'});
    }

    procSelected(proc){
        this.selectedProc = proc;
        this.procSearchTerm = `${proc.CptKey} | ${proc.Description}`;
        this.procError = null;
    }

    modSelected(mod){
        this.listComboSearchTerm = mod.Description1;
        this.procError = null;
    }

    setupData(){
        let self = this;
        self.searchListCombos();
        self.searchProcedures();
        self.getMappings();
    }

    activate(params){
        let self = this;
        if (params.hasOwnProperty("jwt")){
            self.helper.processToken(params.jwt);
            self.setupData();
        } else {
            self.needsLogin = true;
        }
    }

    activatePopovers(){
        let popover = $('[data-toggle="popover"]');
        popover.popover();
    }

    attached(){
        let self = this;

        self.activatePopovers();

        if(!self.needsLogin){
            return;
        }
        self.dialogService.open({viewModel: Login, model: {}}).whenClosed(response => {
            self.setupData();
        });

    }

}
