// @ts-nocheck
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/unified/FileUploader",
    'sap/ui/core/Fragment',
    "sap/m/MessageBox"
],
	/**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, FileUploader, Fragment, MessageBox) {
        "use strict";
        var oController;
        var Destinations;
        var FileUploaderPopup;
        var TabModel = new sap.ui.model.json.JSONModel();
        var DataTable;
        var DataTableBar;
        var TabEditFlag = 0;
        var ValueChangeFlag = 0;
        var TabChangeList = [];
        // var ModelChangeList = 
        var entityDetails = {};
        var SelectedNodeObject = "";
        var SelectedNodeOperation = "";
        var UpdateOperationType = ""; //PUT->Update, POST->Create

        return Controller.extend("s4hana.CEToolkit.controller.Main", {
            onInit: function () {

                oController = this;
                DataTable = oController.getView().byId("dataTableId");
                DataTableBar = oController.getView().byId("tableBarId");

                var oTreeModel = new sap.ui.model.json.JSONModel();
                oTreeModel.loadData("./files/treeData.json");
                this.getView().byId("treeId").setModel(oTreeModel);

                var localModel = new sap.ui.model.json.JSONModel();
                sap.ui.getCore().setModel(localModel, "localModel");

                oController.TableFilter = {};

                //Login Popup -  Start (Comment/ remove if not required)
                // oController.LoginDialog = sap.ui.xmlfragment("s4hana.CEToolkit.fragment.LoginDialog", oController);
                // oController.getView().addDependent(oController.LoginDialog);
                // oController.LoginDialog.open();
                //Login Popup - End

                //Add destinations here
                Destinations = ["S4HC_Sandbox"];


            },

            onLoginPress: function (oEvent) {

                var items = oController.LoginDialog.getContent()[0].getItems();
                var valueusr, valuepwd;

                for (var i = 0; i < items.length; i++) {
                    if (items[i].getId() == "userInputId") {
                        valueusr = items[i].getValue();
                    } else if (items[i].getId() == "pwdInputId") {
                        valuepwd = items[i].getValue();
                    }
                }

                if (valueusr == "INFS4DEMO" && valuepwd == "Welcome1") {
                    oController.LoginDialog.close();
                } else {
                    MessageBox.error("Please enter valid credentials to proceed!!");
                }

            },


            onOperationSelection: function (oEvent) {

                var Placeholder = "";
                var Label = "";
                var oButton = oController.getView().byId("ButtonId");
                var item = oController.getView().byId("treeId").getModel().getProperty(oEvent.getSource().getSelectedContextPaths()[0]);
                var itemId = item.id;

                DataTableBar.destroyContentRight();
                // DataTableBar.destroyContentLeft();
                DataTable.removeAllItems();
                DataTable.destroyColumns();
                oController.getView().byId("InputId").setValue("");
                oButton.setVisible(true);

                if (itemId.includes("Download")) {
                    if (itemId.includes("CDS")) {
                        oButton.setVisible(false);
                    } else {
                        oButton.setText("Download Template");
                    }
                    oButton.setIcon("sap-icon://sys-next-page");
                    // oButton.setIcon("sap-icon://download");
                    SelectedNodeOperation = "Download";
                    // this.getView().byId("DownloadButtonId").setVisible(false);
                    oController.getView().byId("DownloadButtonId").setVisible(true);
                } else if (itemId.includes("Upload")) {
                    oButton.setText("Upload Data File");
                    // oButton.setIcon("sap-icon://upload");
                    oButton.setIcon("sap-icon://sys-first-page");
                    SelectedNodeOperation = "Upload";
                    oController.getView().byId("DownloadButtonId").setVisible(false);
                } else if (itemId.includes("Display")) {
                    oButton.setText("Display Data");
                    oButton.setIcon("sap-icon://display");
                    SelectedNodeOperation = "Display";
                    oButton.setVisible(true);
                    // if (itemId.includes("CDS")) {
                    oController.getView().byId("DownloadButtonId").setVisible(!itemId.includes("CDS"));
                    // }
                }

                //On click on node, display the node guidelines
                if (itemId == "CBONodeId" || itemId == "APINodeId" || itemId == "CDSNodeId") {
                    oController.getView().byId("splitContainerId").to(oController.createId("nodeDetailId"));
                    oController.getView().byId("infoCBONodeId").setVisible(false);
                    oController.getView().byId("infoAPINodeId").setVisible(false);
                    oController.getView().byId("infoCDSNodeId").setVisible(false);
                    oController.getView().byId("info" + itemId).setVisible(true);
                } else { //On click on subnodes go to operations page
                    if (itemId.includes("CBO")) {
                        Placeholder = "Enter CBO .....";
                        Label = "Custom Business Object";
                        SelectedNodeObject = 'CBO';
                    } else if (itemId.includes("API")) {
                        Placeholder = "Enter API Name/Entity Name .....";
                        Label = "API Name with Entity Name";
                        SelectedNodeObject = 'API';
                    } else if (itemId.includes("CDS")) {
                        Placeholder = "Enter CDS Name .....";
                        Label = "Custom CDS Name";
                        SelectedNodeObject = 'CDS';
                        // oController.getView().byId("DownloadButtonId").setVisible(false);
                    }
                    oController.getView().byId("InputLabelId").setText(Label);
                    oController.getView().byId("InputId").setPlaceholder(Placeholder);
                    oController.getView().byId("splitContainerId").to(oController.createId("tableDetailId"));
                }

            },

            validateInput: function () {
                
                var entityName, entityService, entityIndex, entityProperties, entityKeys = [];
                var entityTypeName, entityCreatable = true,
                    entityUpdatable = true, entityDeletable = true;
                var input = oController.getView().byId("InputId").getValue();
                var Creatable = true,
                    Updatable = true,
                    Complex = false;
                var complexEntityFields = [];
                var PropertyExtensions;
                var Keys;
                var CreatableProperties = {},
                    UpdatableProperties = {},
                    Properties = {};

                if (input == "") {
                    MessageBox.error('Please enter valid ' + SelectedNodeObject + ' name.');
                } else {
                    if (SelectedNodeObject == 'API') {
                        entityName = input.split("/")[1];
                        entityService = input.split("/")[0];
                    } else if (SelectedNodeObject == 'CBO') {
                        entityName = input;
                        entityService = input.toUpperCase() + "_CDS";
                    } else if (SelectedNodeObject == 'CDS') {
                        entityName = input;
                        entityService = input.toUpperCase() + "_CDS";
                    }

                    if ((entityName == "" || !entityName) && SelectedNodeObject == 'API') {                        
                        MessageBox.error('Please enter API and EntitySet in the format "APIName/EntityName"');
                    } else {

                        //Initantiate model - Try for various destinations and see which destination gives the metadata
                        var promises = [];


                        for (var d in Destinations) {

                            promises.push(new Promise(function (resolve, reject) {
                                var oModel = new sap.ui.model.odata.v2.ODataModel("/s4hanaCEToolkit/" + Destinations[d] + "/sap/opu/odata/sap/" + entityService, true);
                                oModel.attachMetadataFailed(null, function () {
                                    resolve('');                                   
                                }, null);
                                oModel.attachMetadataLoaded(null, function () {                                    
                                    resolve(oModel);
                                });
                            }));
                        }
                        Promise.all(promises).then(function (responses) {

                            var oMeta;  
                            var oModel ;                          
                            for (var r in responses) {
                                if (responses[r] !== "") {
                                    oModel = responses[r];
                                    oMeta = oModel.getServiceMetadata();                                                                        
                                    break;
                                }
                            }
                            if (!oMeta) {
                                MessageBox.error('Metadata could not be retrieved for the ' + SelectedNodeObject + '.');
                            } else {
                                for (var i = 0; i < oMeta.dataServices.schema[0].entityContainer[0].entitySet.length; i++) {
                                    if (oMeta.dataServices.schema[0].entityContainer[0].entitySet[i].name == entityName) {
                                        //Get EntityType name for entered EntitySet 
                                        entityTypeName = oMeta.dataServices.schema[0].entityContainer[0].entitySet[i].entityType.split(".")[1];
                                        //Check if EntitySet is updatable/creatable
                                        PropertyExtensions = oMeta.dataServices.schema[0].entityContainer[0].entitySet[i].extensions;
                                        for (var j = 0; j < PropertyExtensions.length; j++) {
                                            if (PropertyExtensions[j].name == "creatable" && PropertyExtensions[j].value == "false") {
                                                entityCreatable = false;
                                            } else if (PropertyExtensions[j].name == "updatable" && PropertyExtensions[j].value == "false") {
                                                entityUpdatable = false;
                                            } else if (PropertyExtensions[j].name == "deletable" && PropertyExtensions[j].value == "false") {
                                                entityDeletable = false;
                                            }
                                        }
                                        break;
                                    }
                                }
                                if (entityTypeName) {
                                    //Get index of the EntityType for the EntitySet
                                    for (var i = 0; i < oMeta.dataServices.schema[0].entityType.length; i++) {
                                        if (oMeta.dataServices.schema[0].entityType[i].name == entityTypeName) {
                                            entityIndex = i;
                                        }
                                    }

                                    if (entityIndex >= 0) {
                                        //Get the properties of the EntityType
                                        entityProperties = oMeta.dataServices.schema[0].entityType[entityIndex].property;
                                        //Get the keys of the entity
                                        Keys = Object.values(oMeta.dataServices.schema[0].entityType[entityIndex].key.propertyRef);
                                        for (var k = 0; k < Keys.length; k++) {
                                            entityKeys.push(Keys[k].name);
                                        }
                                        //Mark the fields as updatable/creatable
                                        for (var i = 0; i < entityProperties.length; i++) {
                                            Creatable = true;
                                            Updatable = true;
                                            Complex = false;
                                            if (entityProperties[i].extensions) {
                                                PropertyExtensions = entityProperties[i].extensions;
                                                for (var j = 0; j < PropertyExtensions.length; j++) {
                                                    if (PropertyExtensions[j].name == "creatable" && PropertyExtensions[j].value == "false") {
                                                        Creatable = false;
                                                    } else if (PropertyExtensions[j].name == "updatable" && PropertyExtensions[j].value == "false") {
                                                        Updatable = false;
                                                    }
                                                }
                                            }
                                            //If its a key field then it is not updatable
                                            if (entityKeys.includes(entityProperties[i].name)) {
                                                Updatable = false;
                                            } else if (!entityProperties[i].type.includes("Edm.")) { //Complex Types not updatabe/creatable
                                                Updatable = false; Creatable = false;
                                                Complex = true;
                                                complexEntityFields.push(entityProperties[i].name);
                                            }
                                            //Collect all properties
                                            Properties[entityProperties[i].name] = {
                                                property: entityProperties[i].name,
                                                label: entityProperties[i].name,
                                                type: entityProperties[i].type,
                                                complex: Complex
                                            };
                                            //Collect creatable/Updatable properties
                                            if (Creatable == true) {
                                                CreatableProperties[entityProperties[i].name] = Properties[entityProperties[i].name];
                                            }
                                            if (Updatable == true) {
                                                UpdatableProperties[entityProperties[i].name] = Properties[entityProperties[i].name];
                                            }
                                        }

                                        //Check for Complex Types and Collect the properties of the same
                                        var complexTypes = oMeta.dataServices.schema[0].complexType;
                                        var complexProperties = {};
                                        var complexEntityProperties = {};
                                        if (complexTypes) {
                                            for (var t = 0; t < complexTypes.length; t++) { //For each complex entity
                                                var ComplexPropertiesTemp = complexTypes[t].property; //
                                                for (var i = 0; i < ComplexPropertiesTemp.length; i++) {
                                                    Creatable = true;
                                                    Updatable = true;
                                                    if (ComplexPropertiesTemp[i].extensions) {
                                                        PropertyExtensions = ComplexPropertiesTemp[i].extensions;
                                                        for (var j = 0; j < PropertyExtensions.length; j++) {
                                                            if (PropertyExtensions[j].name == "creatable" && PropertyExtensions[j].value == "false") {
                                                                Creatable = false;
                                                            } else if (PropertyExtensions[j].name == "updatable" && PropertyExtensions[j].value == "false") {
                                                                Updatable = false;
                                                            }
                                                        }
                                                    }
                                                    //Collect all properties
                                                    complexProperties[ComplexPropertiesTemp[i].name] = {
                                                        property: ComplexPropertiesTemp[i].name,
                                                        label: ComplexPropertiesTemp[i].name,
                                                        type: ComplexPropertiesTemp[i].type,
                                                        creatable: Creatable,
                                                        updatable: Updatable
                                                    };

                                                }
                                                complexEntityProperties[complexTypes[t].name] = complexProperties;
                                            }
                                        }


                                        //Add complex fields to the entity fields
                                        complexEntityFields.forEach(function (field) {
                                            ComplexPropertiesTemp = complexEntityProperties[field];
                                            for (var p in ComplexPropertiesTemp) { //For each complex entity                                      
                                                Properties[field + "/" + p] = {
                                                    property: field + "/" + p,
                                                    label: ComplexPropertiesTemp[p].name,
                                                    type: ComplexPropertiesTemp[p].type,
                                                    complex: false
                                                };
                                                if (ComplexPropertiesTemp[p].creatable == true) {
                                                    CreatableProperties[field + "/" + p] = Properties[field + "/" + p];
                                                }
                                                if (ComplexPropertiesTemp[p].updatable == true) {
                                                    UpdatableProperties[field + "/" + p] = Properties[field + "/" + p];
                                                }
                                            };
                                        });


                                        entityDetails = {
                                            model: oModel,
                                            meta: oMeta,
                                            entityName: entityName,
                                            entityService: entityService,
                                            entityProperties: entityProperties,
                                            creatableProperties: CreatableProperties,
                                            updatableProperties: UpdatableProperties,
                                            entityCreatable: entityCreatable,
                                            entityUpdatable: entityUpdatable,
                                            entityDeletable: entityDeletable,
                                            properties: Properties,
                                            entityKeys: entityKeys,
                                            complexEntityFields: complexEntityFields,
                                            complexEntityProperties: complexEntityProperties
                                        };

                                        //Proceed with processing in case of no error
                                        if (SelectedNodeOperation == "Download") {
                                            oController.onDownload(oController.DownloadType);
                                        } else if (SelectedNodeOperation == "Upload") {
                                            oController.onUpload();
                                        } else if (SelectedNodeOperation == "Display") {
                                            if (oController.DownloadType == "") {
                                                oController.onDisplay();
                                            } else {
                                                oController.onDownload(oController.DownloadType);
                                            }
                                        }

                                    } else {                                        
                                        MessageBox.error('Could not fetch Entity Properties for ' + SelectedNodeObject + ' ' + entityName + '.');
                                    }
                                } else {                                    
                                    MessageBox.error('Invalid Entity Name: ' + entityName + '.');
                                }
                            }

                        });
                        
                    }

                }

            },

            onButtonPress: function (oEvent) {

                oController.SaveMessage = "";
                if (SelectedNodeOperation == "Download") {
                    oController.DownloadType = "TEMPLATE";
                } else {
                    oController.DownloadType = "";
                }
                oController.validateInput();

            },

            onDownloadButtonPress: function (oEvent) {

                oController.DownloadType = "DATA";
                oController.validateInput();


            },

            onDownload: function (oDownloadOption) {

                //This function downloads the template/data for API,CBO and CDS( only data in case of CDS ) 
                jQuery.sap.require("sap.ui.export.Spreadsheet");
                var Properties;
                var Count = 0;
                var Data;
                var oModel = entityDetails.model;

                sap.ui.core.BusyIndicator.show();

                if (oDownloadOption == "TEMPLATE") {
                    Properties = entityDetails.creatableProperties; //Download only Creatable properties in case of template
                    if (entityDetails.entityCreatable == false) {
                        MessageBox.error("Create operation is not possible for this entity.");
                    } else {
                        oController.export(oDownloadOption, Properties, Data, Count);
                    }
                }
                if (oDownloadOption == "DATA") {
                    Properties = entityDetails.properties; //Download all properties in case of data                   
                    oModel.read("/" + entityDetails.entityName + "?$inlinecount=allpages", { //Get the total count
                        async: false,
                        success: function (oData) {
                            if (oData.__count) {
                                Count = parseInt(oData.__count);
                            }
                            Data = oData.results;
                            oController.export(oDownloadOption, Properties, Data, Count);
                        }
                    });
                }

            },

            export: function (oDownloadOption, Properties, Data, Count) {

                var Type = "";
                var Columns = [];
                var Select = "";
                var DataSource;
                var Template = {};

                for (var i in Properties) {
                    if (Properties[i].complex !== true) {
                        Type = "";
                        Select = Select + Properties[i].property + ",";
                        if (oDownloadOption == "DATA") {
                            Columns.push({
                                property: Properties[i].property,
                                label: Properties[i].property,
                                type: Type
                            });
                        } else if (Properties[i].property !== "SAP_UUID") { //Exclude key properties from template
                            Template[Properties[i].property] = "";
                            Columns.push({
                                property: Properties[i].property,
                                label: Properties[i].property,
                                type: Type
                            });
                        }
                    }
                }
                Select = Select.slice(0, -1);

                if (oDownloadOption == "TEMPLATE") { //Configure template columns without data                        
                    DataSource = [Template];
                } else { //Configure the data source
                    DataSource = oController.formatData(Data, Object.keys(Properties), Properties);
                }

                sap.ui.core.BusyIndicator.hide();

                //Configure the excel export 
                var exportConfiguration = {
                    workbook: {
                        columns: Columns
                    },
                    dataSource: DataSource,
                    fileName: entityDetails.entityName
                };
                var oSpreadsheet = new sap.ui.export.Spreadsheet(exportConfiguration);
                var oExportPromise = oSpreadsheet.build();
                oExportPromise.then(function () {
                    // Here you can perform additional steps after the export has finished
                });



            },

            formatData: function (oData, oKeys, oProperties) {

                var Properties = oProperties;
                var keys = oKeys;
                var dateTimeFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    pattern: "MM/dd/yyyy HH:mm:ss"
                });
                var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    pattern: "MM/dd/yyyy"
                });
                var timeFormat = sap.ui.core.format.DateFormat.getTimeInstance({
                    pattern: "HH:mm:ss"
                });
                // var DataKeys = Object.keys(oData[0]);
                var complex = {};
                var rows = [];
                for (var i = 0; i < oData.length; i++) {
                    var item = {};
                    for (var k in keys) {
                        var field = keys[k];
                        var value = oData[i][field];

                        // if (!DataKeys.includes(field)) {
                        //     if (DataKeys.includes(field + " (UTC)")) {
                        //         value = oData[i][field + " (UTC)"];
                        //     }
                        // }
                        if (field == "SAP_UUID" && UpdateOperationType == "POST" && SelectedNodeOperation == "Upload") {
                            value = "";
                        } else if (entityDetails.entityKeys.includes(field) && UpdateOperationType == "PUT" && !value && SelectedNodeOperation == "Upload") {
                            sap.ui.core.BusyIndicator.hide();
                            MessageBox.error('Key field values cannot be blank for update operation.');
                            FileUploaderPopup.close();
                            return;
                        } else if (value == "" || !value) {
                            value = "";
                        } else if (Properties[field].type == "Edm.DateTimeOffset") {
                            // if (SelectedNodeOperation == "Display"){
                            //     value.__offset = "+05:30";
                            // }
                            // dateTimeFormat.format(new Date(value.toLocaleString('en-IN')))

                            var parsedDate = new Date(value);
                            // console.log(value, parsedDate)
                            if (parsedDate == "Invalid Date" && SelectedNodeOperation == "Upload") {
                                sap.ui.core.BusyIndicator.hide();
                                MessageBox.error('Kindly validate date fields');
                                FileUploaderPopup.close();
                                return;
                            } else {
                                value = dateTimeFormat.format(parsedDate);
                            }
                        } else if (Properties[field].type == "Edm.Date" || Properties[field].type == "Edm.DateTime") {
                            // if (oData[i]["BusinessPartner"] == "1000070"){
                            // console.log(oData[i])
                            // }
                            var parsedDate = new Date(value);
                            if (parsedDate == "Invalid Date" && SelectedNodeOperation == "Upload") {
                                sap.ui.core.BusyIndicator.hide();
                                MessageBox.error('Kindly validate date fields');
                                FileUploaderPopup.close();
                                return;
                            } else {
                                value = dateFormat.format(parsedDate, true);
                            }
                        } else if (Properties[field].type == "Edm.Time") {
                            if (UpdateOperationType == "POST") {
                                value = timeFormat.format(new Date(value));
                            } else {
                                value = timeFormat.format(new Date(value.ms));
                            }
                        } else if (Properties[field].type == "Edm.Boolean") {
                            if (value == "") {
                                value = false;
                            } else {
                                value = true;
                            }
                        }
                        if (field.includes("/") && UpdateOperationType == "POST") { //Upload of complex structure
                            if (!complex[field.split("/")[0]]) {
                                complex[field.split("/")[0]] = {};
                            }
                            complex[field.split("/")[0]][field.split("/")[1]] = value;
                        } else {
                            item[field] = value;
                        }
                    }
                    if (Object.keys(complex).length) {
                        for (var c in complex) {
                            item[c] = complex[c];
                        }
                        complex = {};
                    }
                    rows.push(item);
                }

                return (rows)

            },

            onUploadFile: function (oEvent) {

                //This function displays file data after file import file data
                var data = sap.ui.getCore().getModel("localModel").getData();
                // UpdateOperationType = "POST";

                var SelectedRBIndex = FileUploaderPopup.getContent()[0].getItems()[2].getSelectedIndex();
                if (SelectedRBIndex == 0) {
                    UpdateOperationType = "POST";
                } else if (SelectedRBIndex == 1) {
                    UpdateOperationType = "PUT";
                }


                if (data.items.length) {
                    FileUploaderPopup.close();
                    oController.setUpDisplayTable(data.items);
                } else {
                    MessageBox.error('Please enter a valid file with data.');
                    // MessageBox.error('Please select a valid file.');
                }

            },

            setUpDisplayTable: function (oData) {

                //This function is used for display of file/system data in the UI 
                var ValidTemplate = true;
                var dateTimeFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    // pattern: "LLL d, yyyy",
                    pattern: "MM/dd/yyyy HH:mm:ss"
                });
                var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    // pattern: "LLL d, yyyy",
                    pattern: "MM/dd/yyyy"
                });
                var timeFormat = sap.ui.core.format.DateFormat.getTimeInstance({
                    pattern: "HH:mm:ss"
                });
                var rows = [];
                var cells = [];
                TabChangeList = [];
                ValueChangeFlag = 0;
                TabEditFlag = 0;

                if (oController.SaveMessage) {
                    UpdateOperationType = "PUT";
                }

                if (UpdateOperationType == "POST") { //In case of file upload
                    // if (SelectedNodeOperation == "Upload") { //In case of file upload
                    //Display only creatable properties in case of upload
                    var Properties = entityDetails.creatableProperties;
                    var keys = Object.keys(entityDetails.creatableProperties);
                    //Check if the uploaded template is valid
                    for (var t in Object.keys(oData[0])) {
                        if (!keys.includes(Object.keys(oData[0])[t])) {
                            ValidTemplate = false;
                            break;
                        }
                    }
                } else if (UpdateOperationType == "PUT" || UpdateOperationType == "DELETE") { //In case of update
                    // } else if (SelectedNodeOperation == "Display") { //In case of update
                    // if (SelectedNodeOperation == "Upload") {
                    //     //Display updatable properties + key fields
                    //     var Properties = entityDetails.properties;
                    //     var keys = Object.keys(entityDetails.updatableProperties)
                    //     keys = entityDetails.entityKeys.concat(keys);
                    // } else {
                    //Display all entity properties in case of display
                    var Properties = entityDetails.properties;
                    var keys = Object.keys(entityDetails.properties);
                    // }

                }

                DataTableBar.destroyContentRight();
                // DataTableBar.destroyContentLeft();
                DataTable.removeAllItems();
                DataTable.destroyColumns();

                if (ValidTemplate == false) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("File structure does not match the " + SelectedNodeObject + " structure. Please enter a valid file.");
                } else {

                    // DataTableBar.addContentLeft(new sap.m.Title({text:"  Total Count: " + oData.length, level: sap.ui.core.TitleLevel.H1}));
                    //Add table bar header content                    
                    var editButton = new sap.m.Button({
                        id: "editButtonId",
                        icon: "sap-icon://edit",
                        press: oController.onEdit,
                        visible: true
                    });
                    var saveButton = new sap.m.Button({
                        id: "saveButtonId",
                        icon: "sap-icon://save",
                        press: oController.onSavePress,
                        enabled: false,
                        visible: true
                    });
                    var persoButton = new sap.m.Button({
                        id: "persoButtonId",
                        icon: "sap-icon://action-settings",
                        press: oController.onColumnSelection
                    });
                    DataTableBar.addContentRight(editButton);
                    DataTableBar.addContentRight(saveButton);
                    DataTableBar.addContentRight(persoButton);

                    if (SelectedNodeObject == 'CDS') {
                        editButton.setVisible(false)
                        saveButton.setVisible(false)
                    }

                    //Add table columns
                    for (var i = 0; i < keys.length; i++) {
                        var oColumn = new sap.m.Column({
                            header: new sap.m.Label({
                                text: keys[i]
                            })
                        });
                        // if (keys[i] == "SAP_UUID" || entityDetails.complexEntityFields.includes(keys[i])) {
                        if (entityDetails.complexEntityFields.includes(keys[i])) {
                            oColumn.setVisible(false);
                        }
                        DataTable.addColumn(oColumn);
                    }

                    //Prepare data table
                    rows = oController.formatData(oData, keys, Properties);

                    TabModel.setData({
                        rows: rows,
                        properties: entityDetails.entityProperties
                    });
                    // TabModel.setSizeLimit(rows.length);
                    DataTable.setModel(TabModel);
                    oController.getView().setModel(TabModel);

                    for (var m = 0; m < keys.length; m++) {
                        var cell = new sap.m.Text({
                            text: "{" + keys[m] + "}"
                        });
                        cells.push(cell);
                    }
                    var columnList = new sap.m.ColumnListItem({
                        cells: cells
                    });
                    DataTable.bindItems("/rows", columnList);

                    // if (UpdateOperationType == "POST") {
                    if (SelectedNodeOperation == "Upload") {
                        DataTable.setMode("MultiSelect");
                    } else if (UpdateOperationType == "PUT") {
                        DataTable.setMode("None");
                        if (entityDetails.entityUpdatable == false && entityDetails.entityDeletable == false) {
                            editButton.setEnabled(false)
                        }
                        saveButton.setEnabled(false);
                    }
                    DataTable.attachSelectionChange(function (oEvent) {

                        TabChangeList = [];
                        var Paths = oEvent.getSource().getSelectedContextPaths();
                        for (var i in Paths) {
                            if (!TabChangeList.includes(Paths[i].substring(6))) {
                                TabChangeList.push(Paths[i].substring(6));
                            }
                        }

                        if (TabChangeList.length !== 0) {
                            saveButton.setEnabled(true);
                        } else {
                            saveButton.setEnabled(false);
                        }

                    });

                    DataTable.addEventDelegate({
                        onAfterRendering: function () {
                            var oHeader = this.$().find('.sapMListTblHeaderCell'); //Get hold of table header elements
                            for (var i = 0; i < oHeader.length; i++) {
                                var oID = oHeader[i].id;
                                oController.addColumnHeaderOptions(oID);
                            }
                        }
                    }, DataTable);

                    if (oController.SaveMessage) {
                        MessageBox.success(oController.SaveMessage);
                        oController.SaveMessage = "";
                    } else if (UpdateOperationType == "POST") {
                        FileUploaderPopup.close();
                        // MessageBox.success('File uploaded successfully!');
                    } else {
                        if (SelectedNodeObject !== 'CDS') {
                            if (entityDetails.entityUpdatable == false) {
                                MessageBox.information("Data loaded successfully! \n\nPlease Note: Update operation is not supported by this entity.");
                            } else if (entityDetails.entityDeletable == false) {
                                MessageBox.information("Data loaded successfully! \n\nPlease Note: Delete operation is not supported by this entity.");
                            } else {
                                // MessageBox.success('Data loaded successfully!');
                            }
                        }
                        if (SelectedNodeOperation == "Upload") {
                            FileUploaderPopup.close();
                        }
                    }
                }
                sap.ui.core.BusyIndicator.hide();
            },


            onColumnSelection: function (event) {

                var List = oController.byId("columnSelectionList");
                var popOver = oController.byId("columnSelectionPopOver");
                if (List !== undefined) {
                    List.destroy();
                }
                if (popOver !== undefined) {
                    popOver.destroy();
                }
                /*----- PopOver on Clicking ------ */
                var popover = new sap.m.Popover(oController.createId("columnSelectionPopOver"), {
                    title: "Table Personalisation",
                    showHeader: true,
                    showFooter: true,
                    placement: sap.m.PlacementType.Bottom,
                    content: []
                }).addStyleClass("sapMOTAPopover sapTntToolHeaderPopover");

                /*----- Adding List to the PopOver -----*/
                var oList = new sap.m.List(oController.createId("columnSelectionList"), {
                    headerToolbar: new sap.m.Toolbar({
                        content: [
                            new sap.m.CheckBox({
                                text: "Select All",
                                selected: true,
                                select: oController.onColumnSelectAllChange
                            })]
                    }),
                    select: oController.onColumnSelect
                });
                oController.byId("columnSelectionPopOver").addContent(oList);
                var columnHeader = DataTable.getColumns();
                var tableColumns = [];
                for (var i = 0; i < columnHeader.length; i++) {
                    var hText = columnHeader[i].getAggregation("header").getProperty("text");
                    // if (hText !== "SAP_UUID" && !entityDetails.complexEntityFields.includes(hText)){
                    if (!entityDetails.complexEntityFields.includes(hText)) {
                        var columnObject = {};
                        columnObject.column = hText;
                        tableColumns.push(columnObject);
                    }
                }
                var oModel1 = new sap.ui.model.json.JSONModel({
                    list: tableColumns
                });
                var itemTemplate = new sap.m.StandardListItem({
                    title: "{oList>column}"
                });
                oList.setMode("MultiSelect");
                oList.setModel(oModel1);
                sap.ui.getCore().setModel(oModel1, "oList");
                var oBindingInfo = {
                    path: 'oList>/list',
                    template: itemTemplate
                };
                oList.bindItems(oBindingInfo);
                var footer = new sap.m.Bar({
                    contentLeft: [],
                    contentMiddle: [new sap.m.Button({
                        text: "Cancel",
                        press: function () {
                            oController.byId("columnSelectionPopOver").close();
                        }
                    }),
                    new sap.m.Button({
                        text: "Apply",
                        press: function () {
                            oController.onColumnSelectionApply();
                        }
                    })
                    ]

                });

                oController.byId("columnSelectionPopOver").setFooter(footer);
                var oList1 = oController.byId("columnSelectionList");
                var table = DataTable.getColumns();
                /*=== Update finished after list binded for selected visible columns ==*/
                oList1.attachEventOnce("updateFinished", function () {
                    var a = 0;
                    for (var j = 0; j < table.length; j++) {
                        var Text = table[j].getHeader().getProperty("text");
                        var v = table[j].getProperty("visible");
                        // if(Text !== "SAP_UUID" && !entityDetails.complexEntityFields.includes(Text)){
                        if (!entityDetails.complexEntityFields.includes(Text)) {
                            if (v === true) {
                                var firstItem = oList1.getItems()[a];
                                oList1.setSelectedItem(firstItem, true);
                            }
                            a = a + 1;
                        }

                    }

                });
                popover.openBy(event.getSource());
            },

            onColumnSelect: function (oEvent) {

                var SelectedCount = oController.byId("columnSelectionList").getSelectedItems().length;
                var TotalCount = oController.byId("columnSelectionList").getItems().length;

                if (SelectedCount == TotalCount) {
                    oController.byId("columnSelectionList").getHeaderToolbar().getContent()[0].setSelected(true);
                } else {
                    oController.byId("columnSelectionList").getHeaderToolbar().getContent()[0].setSelected(false)
                }
            },


            onColumnSelectAllChange: function (oEvent) {

                console.log(oEvent.getSource())
                var selectAll = oEvent.getParameter("selected");
                var ListItems = oController.byId("columnSelectionList").getItems();

                for (var j = 0; j < ListItems.length; j++) {
                    ListItems[j].setSelected(selectAll);
                }

            },

            onColumnSelectionApply: function () {

                var oList = oController.byId("columnSelectionList");
                var array = [];
                var items = oList.getSelectedItems();

                // Getting the Selected Columns header Text.
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    var context = item.getBindingContext("oList");
                    var obj = context.getProperty(null, context);
                    var column = obj.column;
                    array.push(column);
                }
                /*---- Displaying Columns Based on the selection of List ----*/
                var columns = DataTable.getColumns();
                for (var j = 0; j < columns.length; j++) {
                    var Text = columns[j].getHeader().getProperty("text");
                    var Column = columns[j].getId();
                    var columnId = oController.getView().byId(Column);
                    if (array.indexOf(Text) > -1) {
                        columns[j].setVisible(true);
                    } else {
                        columns[j].setVisible(false);
                    }
                }
                oController.byId("columnSelectionPopOver").close();
            },

            addColumnHeaderOptions: function (event) {

                if (!oController.columnSortPopOver) {
                    oController.columnSortPopOver = sap.ui.xmlfragment("s4hana.CEToolkit.fragment.SortPopover", oController);
                    oController.getView().addDependent(oController.columnSortPopOver);
                }

                // oController.TableFilter = {};

                $('#' + event).click(function (oEvent) { //Attach Table Header Element Event
                    var oTarget = oEvent.currentTarget; //Get hold of Header Element
                    oController.selectedColumnHeader = oTarget.childNodes[0].textContent; //Get Column Header text

                    var Value = "";
                    if (oController.selectedColumnHeader) {
                        if (oController.TableFilter[oController.selectedColumnHeader]) {
                            Value = oController.TableFilter[oController.selectedColumnHeader];
                        }
                        oController.columnSortPopOver.getContent()[0].getItems()[2].getContent()[0].getItems()[1].setValue(Value);
                        oController.columnSortPopOver.openBy(oTarget);
                    }
                });

            },

            onSortAscending: function (oEvent) {

                var oBinding = DataTable.getBinding("items"),
                    aSorters = [];
                aSorters.push(new sap.ui.model.Sorter(oController.selectedColumnHeader, false));
                oBinding.sort(aSorters);

                sap.m.MessageToast.show("Data sorted successfully!");

            },

            onSortDescending: function (oEvent) {

                var oBinding = DataTable.getBinding("items"),
                    aSorters = [];
                aSorters.push(new sap.ui.model.Sorter(oController.selectedColumnHeader, true));
                oBinding.sort(aSorters);

                sap.m.MessageToast.show("Data sorted successfully!");
            },

            onFilterChange: function (oEvent) {

                console.log(oEvent);
                // add filter for search
                var aFilters = [];
                var sQuery = oEvent.getSource().getValue();
                if (sQuery && sQuery.length > 0) {
                    var filter = new sap.ui.model.Filter(oController.selectedColumnHeader, sap.ui.model.FilterOperator.Contains, sQuery);
                    aFilters.push(filter);
                }
                oController.TableFilter = {};
                // var Header = oController.selectedColumnHeader;
                oController.TableFilter[oController.selectedColumnHeader] = sQuery;

                // update list binding
                var oBinding = DataTable.getBinding("items");
                oBinding.filter(aFilters);

                sap.m.MessageToast.show("Filter applied to data successfully.");

            },


            fileImport: function (file) {

                var localModel = sap.ui.getCore().getModel("localModel");
                var excelData = {};
                if (file && window.FileReader) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        var data = e.target.result;
                        var workbook = XLSX.read(data, {
                            type: 'binary'
                        });
                        workbook.SheetNames.forEach(function (sheetName) {
                            // Here is your object for every sheet in workbook
                            excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);

                        });
                        // Setting the data to the local model 
                        localModel.setData({
                            items: excelData
                        });
                        localModel.refresh(true);

                        if (excelData.length == 0) {
                            MessageBox.error("The uploaded file has no records to display.");
                        }
                    };
                    reader.onerror = function (ex) {
                        console.log(ex);
                        MessageBox.error("Some error occurred during file upload.");
                    };
                    reader.readAsBinaryString(file);
                }
            },

            onLiveChange: function (oEvent) {

                ValueChangeFlag = 1;

            },

            onEdit: function (oEvent) {

                var keys = Object.keys(entityDetails.properties); //comm
                var updatableProperties = entityDetails.updatableProperties;
                var Properties = entityDetails.properties;
                var cells = [];

                sap.ui.core.BusyIndicator.show();

                if (UpdateOperationType == "POST") { //In case of file upload
                    //Display only creatable properties in case of upload
                    var Properties = entityDetails.creatableProperties;
                    var keys = Object.keys(entityDetails.creatableProperties);
                } else if (UpdateOperationType == "PUT") { //In case of update
                    //Display all entity properties in case of display
                    var Properties = entityDetails.properties;
                    var keys = Object.keys(entityDetails.properties);
                }

                DataTable.removeAllItems();
                DataTable.setModel(TabModel);

                if (TabEditFlag == 0) {
                    for (var m = 0; m < keys.length; m++) {
                        var field = keys[m];
                        if (!entityDetails.complexEntityFields.includes(field)) {
                            // if (Object.keys(updatableProperties).includes(field) || UpdateOperationType == "POST") {
                            if ((Object.keys(updatableProperties).includes(field) || UpdateOperationType == "POST") &&
                                (!entityDetails.entityKeys.includes(field))) {
                                if (Properties[field].type == "Edm.Date" || Properties[field].type == "Edm.DateTime") {
                                    cells.push(new sap.m.DatePicker({
                                        value: "{" + field + "}",
                                        editable: true,
                                        valueFormat: "MM/dd/yyyy",
                                        displayFormat: "MM/dd/yyyy",
                                        change: oController.onLiveChange,
                                        fieldWidth: "100%"
                                    }));
                                } else {
                                    cells.push(new sap.m.Input({
                                        value: "{" + field + "}",
                                        editable: true,
                                        liveChange: oController.onLiveChange,
                                        fieldWidth: "100%"
                                    }));
                                }
                            } else {
                                cells.push(new sap.m.Input({
                                    value: "{" + field + "}",
                                    editable: false,
                                    fieldWidth: "100%"
                                }));
                            }
                        }
                    }
                    TabEditFlag = 1;
                    DataTable.setMode("MultiSelect");
                    oEvent.getSource().setIcon("sap-icon://display");

                } else {
                    for (var m = 0; m < keys.length; m++) {
                        if (!entityDetails.complexEntityFields.includes(keys[m])) {
                            cells.push(new sap.m.Text({
                                text: "{" + keys[m] + "}"
                            }));
                        }
                    }
                    TabEditFlag = 0;
                    TabChangeList = [];
                    oEvent.getSource().setIcon("sap-icon://edit");
                    var BarContent = DataTableBar.getContentRight();
                    for (var b in BarContent) {
                        if (BarContent[b].getId() == "saveButtonId") {
                            BarContent[b].setEnabled(false);
                        }
                    }
                    if (UpdateOperationType == "PUT") {
                        DataTable.setMode("None");
                    }
                }
                var ColumnList = new sap.m.ColumnListItem({
                    cells: cells
                });
                DataTable.bindItems("/rows", ColumnList);

                sap.ui.core.BusyIndicator.hide();

            },


            handleNonBatchUpdate: function (batchChanges) {

                var oModel = entityDetails.model;
                console.log(oModel)

                sap.ui.core.BusyIndicator.hide();
                MessageBox.confirm("This object does not support batch operations.\nDo you wish to proceed by submitting individual requests?."
                    + "\n\nNOTE: Processing will take some time. Please restrict the number of records.", {
                    title: "Confirmation",
                    initialFocus: sap.m.MessageBox.Action.OK,
                    onClose: function (sButton) {
                        if (sButton === MessageBox.Action.OK) {
                            oModel.setUseBatch(false);
                            sap.ui.core.BusyIndicator.show();
                            var promises = [];
                            for (var b in batchChanges) {
                                promises.push(new Promise(function (resolve, reject) {

                                    if (batchChanges[b].method == "POST") {
                                        oModel.create(batchChanges[b].uri, batchChanges[b].item, {
                                            success: function (data) {
                                                resolve(data)
                                            },
                                            error: function (e) {
                                                reject(e)
                                            }
                                        });
                                    } else if (batchChanges[b].method == "PUT") {
                                        oModel.update(batchChanges[b].uri, batchChanges[b].item, {
                                            success: function (data) {
                                                resolve(batchChanges[b].item)
                                            },
                                            error: function (e) {
                                                reject(e)
                                            }
                                        });
                                    } else if (batchChanges[b].method == "DELETE") {
                                        oModel.remove(batchChanges[b].uri, {
                                            success: function (data) {
                                                resolve(batchChanges[b].item)
                                            },
                                            error: function (e) {
                                                reject(e)
                                            }
                                        });
                                    }
                                }));
                            }
                            Promise.all(promises).then(function (values) {
                                sap.ui.core.BusyIndicator.hide();
                                if (UpdateOperationType == "POST") {
                                    oController.SaveMessage = "Data created successfully!";
                                    oController.setUpDisplayTable(values);
                                } else if (UpdateOperationType == "PUT") {
                                    oController.SaveMessage = "Data updated successfully!";
                                    if (SelectedNodeOperation == "Upload") {
                                        oController.setUpDisplayTable(values);
                                    } else {
                                        oController.onDisplay();
                                    }
                                } else if (UpdateOperationType == "DELETE") {
                                    oController.SaveMessage = "Data deleted successfully!";
                                    oController.onDisplay();
                                }
                            }, function (msg) {
                                console.log(msg)
                                sap.ui.core.BusyIndicator.hide();
                                MessageBox.error(msg);
                            });

                        } else {
                            sap.ui.core.BusyIndicator.hide();
                        }

                    }
                });

            },


            onSave: function (oEvent) {

                var TableItems = DataTable.getItems();
                var Data = TableItems[0].getModel().getData().rows;
                var EntityProperties = entityDetails.properties; //commented
                var EntityKeys = entityDetails.entityKeys;
                var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    pattern: "yyyy-MM-ddTKK:mm:ss"
                });
                var dateOffsetFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    pattern: "yyyy-MM-ddTKK:mm:ssZ"
                });
                var items = [];
                var oModel = entityDetails.model;


                var batchChanges = [];
                var successData = [];
                var batchGroupId = "";
                var batchGroups = [];
                var itemCounter = 0;
                var itemSuccessCount = 0;
                var itemErrorCount = 0;
                var errorMessage = 0;
                var SelectAll = false;
                oModel.setUseBatch(true);

                //Set response andle for the batch operation
                var itemParameter = {
                    success: function (data) {
                        if (UpdateOperationType == "POST") {
                            successData.push(data);
                        }
                        itemSuccessCount = itemSuccessCount + 1;
                        if (itemErrorCount + itemSuccessCount == items.length) {
                            sap.ui.core.BusyIndicator.hide();
                            if (itemSuccessCount == items.length) {
                                if (UpdateOperationType == "POST") {
                                    oController.SaveMessage = "Data created successfully!";
                                    oController.setUpDisplayTable(successData);
                                } else if (UpdateOperationType == "PUT") {
                                    oController.SaveMessage = "Data updated successfully!";
                                    if (SelectedNodeOperation == "Upload") {
                                        oController.setUpDisplayTable(items);
                                    } else {
                                        oController.onDisplay();
                                    }
                                } else if (UpdateOperationType == "DELETE") {
                                    oController.SaveMessage = "Data deleted successfully!";
                                    oController.onDisplay();
                                }
                            } else {
                                MessageBox.error("Error occurred while updating one or more records\n\n"
                                    + errorMessage + ".\nPlease check the data.");
                            }
                        }
                    },
                    error: function (resp) {

                        itemErrorCount = itemErrorCount + 1;
                        if (JSON.parse(resp.responseText).error) {
                            errorMessage = resp.message + ": " + JSON.parse(resp.responseText).error.message.value;
                        } else if (resp.responseText.includes("Timeout")) {
                            errorMessage = "Response Timed Out. Please verify if the data is reflected in the system";
                        } else {
                            errorMessage = "Some error occurred. Plese try again."
                        }
                        if (itemErrorCount + itemSuccessCount == items.length) {
                            if (resp.statusCode == "400" && errorMessage.includes("Cannot") &&
                                errorMessage.includes("multiple") && errorMessage.includes("changeset")) {
                                oController.handleNonBatchUpdate(batchChanges)
                            } else {
                                sap.ui.core.BusyIndicator.hide();
                                MessageBox.error("Error occurred while updating one or more records.\n\n"
                                    + errorMessage + ".\nPlease check the data.");
                            }
                        }
                    }
                };

                //Check if all items are selcted or a few are selected
                // if ((oTable.getItems().length == oTable.getSelectedItems().length) && 
                // (SelectedNodeOperation == "Upload" || (SelectedNodeOperation == "Display" && UpdateOperationType == "DELETE") )){                    

                if ((DataTable.getItems().length == DataTable.getSelectedItems().length &&
                    SelectedNodeOperation == "Upload") || oController.SaveAll == true) {
                    SelectAll = true;
                    var TabChangeListLength = Data.length;
                    Data = DataTable.getModel().getProperty("/rows");
                } else {
                    var TabChangeListLength = TabChangeList.length;
                }



                if (TabChangeList.length) {
                    if (ValueChangeFlag == 0 && UpdateOperationType == "PUT" && SelectedNodeOperation == "Display") {
                        MessageBox.error('No changes were made by the user.');
                    } else {
                        oModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
                        oModel.setUseBatch(true);


                        // for (var i in TabChangeList) {
                        for (var i = 0; i < TabChangeListLength; i++) {
                            var queryKeys = [];
                            var item = {};
                            if (SelectAll) {
                                var changeIndex = i;
                            } else {
                                var changeIndex = TabChangeList[i];
                            }
                            for (var field in EntityProperties) {
                                var value = Data[changeIndex][field];
                                if (value !== "" && value) {
                                    if (EntityProperties[field].type == "Edm.DateTime") {
                                        var parsedDate = new Date(value);
                                        if (parsedDate == "Invalid Date") {
                                            MessageBox.error('Kindly validate your date data.');
                                            // pop.close();
                                            return;
                                        } else {
                                            item[field] = dateFormat.format(parsedDate);
                                        }
                                    } else if (EntityProperties[field].type == "Edm.Time") {
                                        var parsedDate = new Date('1970-01-01T' + value).getTime();
                                        item[field] = {
                                            ms: parsedDate,

                                            __edmType: "Edm.Time"
                                        };
                                    } else if (EntityProperties[field].type == "Edm.DateTimeOffset") {
                                        var parsedDate = new Date(value);
                                        if (parsedDate == "Invalid Date") {
                                            MessageBox.error('Kindly validate your date data.');
                                            // pop.close();
                                            return;
                                        } else {
                                            item[field] = dateOffsetFormat.format(parsedDate);
                                        }
                                    } else {
                                        item[field] = value;

                                        //Check for keys
                                        if (EntityKeys.includes(field)) {
                                            if (field == "SAP_UUID") {
                                                queryKeys.push(field + "=guid'" + value + "'");
                                            } else {
                                                queryKeys.push(field + "='" + value + "'");
                                            }
                                        }
                                    }
                                }
                            }

                            if ((itemCounter > 0 && itemCounter % 200 == 0) || (itemCounter == 0 && batchGroups.length == 0)) {
                                batchGroupId = "Group" + (batchGroups.length + 1);
                                batchGroups.push(batchGroupId);
                                itemCounter = 0;
                            }
                            itemParameter.groupId = batchGroupId;
                            itemCounter = itemCounter + 1;

                            items.push(item);
                            if (UpdateOperationType == "POST") {
                                oModel.create("/" + entityDetails.entityName, item, itemParameter);
                                batchChanges.push({ method: "POST", uri: "/" + entityDetails.entityName, item: item });
                            } else if (UpdateOperationType == "PUT") {
                                oModel.update("/" + entityDetails.entityName + "(" + queryKeys.join(',') + ")", item, itemParameter);
                                batchChanges.push({ method: "PUT", uri: "/" + entityDetails.entityName + "(" + queryKeys.join(',') + ")", item: item });
                            } else if (UpdateOperationType == "DELETE") {
                                oModel.remove("/" + entityDetails.entityName + "(" + queryKeys.join(',') + ")", itemParameter);
                                batchChanges.push({ method: "DELETE", uri: "/" + entityDetails.entityName + "(" + queryKeys.join(',') + ")", item: item });
                            }
                        }

                        sap.ui.core.BusyIndicator.show();

                        console.log(oModel)
                        oModel.setDeferredGroups(batchGroups);

                        //nonbatch upate
                        oModel.refreshSecurityToken();
                        var Token = oModel.oHeaders['x-csrf-token'];
                        oController.SaveMessage = "";

                        var mBatchParameter = {
                            success: function (innerdata, resp) {

                            },
                            error: function (oError) {
                                sap.ui.core.BusyIndicator.hide();
                                MessageBox.error("Error during batch submission");
                            }
                        };

                        // oModel.submitChanges(mBatchParameter);
                        for (var b in batchGroups) {
                            mBatchParameter.groupId = batchGroups[b];
                            console.log(b)
                            oModel.submitChanges(mBatchParameter);
                        }


                    }
                } else {
                    MessageBox.error('Please select records to proceed.');
                }
            },

            onDisplay: function (oEvent) {

                //This method is used to display CDS/API data                
                var oModel = entityDetails.model;

                sap.ui.core.BusyIndicator.show();
                oController.getView().setModel(oModel);

                oModel.read("/" + entityDetails.entityName + "", {
                    success: function (oData, response) {
                        if (oData.results.length) {
                            UpdateOperationType = "PUT";
                            oController.setUpDisplayTable(oData.results);
                        } else if (SelectedNodeOperation == "Display") {
                            DataTableBar.destroyContentRight();
                            // DataTableBar.destroyContentLeft();
                            DataTable.removeAllItems();
                            DataTable.destroyColumns();
                            sap.ui.core.BusyIndicator.hide();
                            if (UpdateOperationType !== "DELETE") {
                                MessageBox.information("No data found in " + SelectedNodeObject + " " + entityDetails.entityName + ".");
                            }else{
                                MessageBox.success("Data deleted successfully!");
                                UpdateOperationType = "PUT";
                            }
                        }
                    },
                    error: function (err) {
                        MessageBox.error("Error Details:", err);
                    }
                });

            },

            onUpload: function (oEvent) {

                var localModel = sap.ui.getCore().getModel("localModel");
                var excelData = {};
                localModel.setData({
                    items: excelData
                });

                UpdateOperationType = "POST";
                FileUploaderPopup = sap.ui.xmlfragment("s4hana.CEToolkit.fragment.FileUploadDialog", oController);
                oController.getView().addDependent(FileUploaderPopup);

                if (!entityDetails.entityUpdatable) {
                    FileUploaderPopup.getContent()[0].getItems()[2].getButtons()[1].setEnabled(false);
                } else {
                    FileUploaderPopup.getContent()[0].getItems()[2].getButtons()[1].setEnabled(true);
                }

                FileUploaderPopup.open();

            },

            onSavePress: function (oEvent) {

                if (SelectedNodeOperation == "Display") {
                    oController.SaveOptionDialog = sap.ui.xmlfragment("s4hana.CEToolkit.fragment.SaveOptionDialog", oController);
                    oController.getView().addDependent(oController.SaveOptionDialog);

                    oController.SaveOptionDialog.getContent()[0].getItems()[1].getButtons()[0].setEnabled(entityDetails.entityUpdatable);

                    oController.SaveOptionDialog.getContent()[0].getItems()[1].getButtons()[1].setEnabled(entityDetails.entityDeletable);
                    oController.SaveOptionDialog.getContent()[0].getItems()[1].getButtons()[2].setEnabled(entityDetails.entityDeletable)

                    oController.SaveOptionDialog.open();
                } else {
                    // // var count = TabModel.getProperty("/rows").length;
                    // if ( TabModel.getProperty("/rows").length > DataTable.getGrowingThreshold()){
                    //     oController.SaveOptionDialog = sap.ui.xmlfragment("s4hana.CEToolkit.fragment.SaveOptionDialogUp", oController);
                    //     oController.getView().addDependent(oController.SaveOptionDialog);
                    //     oController.SaveOptionDialog.open();
                    // }else{
                    //     oController.onSave();
                    // }
                    oController.onSave();
                }

            },


            onSaveSubmit: function () {

                oController.SaveAll = false;
                var selectedIndex = oController.SaveOptionDialog.getContent()[0].getItems()[1].getSelectedIndex();
                oController.SaveOptionDialog.close();
                // if (SelectedNodeOperation == "Display"){
                if (selectedIndex == 0) { //Update
                    UpdateOperationType = "PUT";
                    oController.onSave();
                } else { //Delete
                    UpdateOperationType = "DELETE";
                    if (selectedIndex == 2) {
                        oController.SaveAll = true;
                    }
                    // ValueChangeFlag = 1;
                    MessageBox.confirm("Are you sure you want to delete the selected records?\n\nPlease keep a backup of data before proceeding.", {
                        actions: [MessageBox.Action.CANCEL, "Continue"],
                        emphasizedAction: "Manage Products",
                        onClose: function (sAction) {
                            if (sAction == "Continue") {
                                oController.onSave();
                            }
                        }
                    });
                }
                // }else{
                //     if (selectedIndex == 0) {
                //         oController.SaveAll = true;
                //     } 
                //     oController.onSave();
                // }
                // oController.onSave();

            },

            onSaveCancel: function () {

                oController.SaveOptionDialog.close()

            },



            onUploadOperationSelect: function (oEvent) {

                var SelectedRBIndex = oEvent.getParameter("selectedIndex");
                if (SelectedRBIndex == 0) {
                    UpdateOperationType = "POST";
                } else if (SelectedRBIndex == 1) {
                    UpdateOperationType = "PUT";
                }
            },

            onFileUploadChange: function (e) {
                oController.fileImport(e.getParameter("files") && e.getParameter("files")[0]);
            },

            onUploaderClose: function () {
                FileUploaderPopup.close();
            },

            onToolkitPress: function (oEvent) {

                oController.getView().byId("splitContainerId").to(oController.createId("toolkitDetailId"));
                if (oController.getView().byId("treeId").getSelectedItem()) {
                    oController.getView().byId("treeId").getSelectedItem().setSelected(false);
                }
            },

            onHomePress: function (oEvent) {

                oController.getView().byId("splitContainerId").to(oController.createId("infoDetailId"));
                if (oController.getView().byId("treeId").getSelectedItem()) {
                    oController.getView().byId("treeId").getSelectedItem().setSelected(false);
                }
            }
        });
    });
