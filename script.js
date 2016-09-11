//XLSX functions

function sheet_from_array_of_arrays(data, opts) {
    var ws = {};
    var range = {s: {c:10000000, r:10000000}, e: {c:0, r:0 }};
    for(var R = 0; R != data.length; ++R) {
        for(var C = 0; C != data[R].length; ++C) {
            if(range.s.r > R) range.s.r = R;
            if(range.s.c > C) range.s.c = C;
            if(range.e.r < R) range.e.r = R;
            if(range.e.c < C) range.e.c = C;
            var cell = {v: data[R][C] };
            if(cell.v == null) continue;
            var cell_ref = XLSX.utils.encode_cell({c:C,r:R});

            if(typeof cell.v === 'number') cell.t = 'n';
            else if(typeof cell.v === 'boolean') cell.t = 'b';
            else if(cell.v instanceof Date) {
                cell.t = 'n'; cell.z = XLSX.SSF._table[14];
                cell.v = datenum(cell.v);
            }
            else cell.t = 's';

            ws[cell_ref] = cell;
        }
    }
    if(range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
    return ws;
}

function Workbook() {
    if(!(this instanceof Workbook)) return new Workbook();
    this.SheetNames = [];
    this.Sheets = {};
}

function s2ab(s) {
    var buf = new ArrayBuffer(s.length);
    var view = new Uint8Array(buf);
    for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
}

//csv functions

var downloadData = function (type, data, filename) {
    var link = document.createElement('a');
    link.download = filename;
    link.href = encodeURI('data:' + type + ',' + data);
    link.style.display = 'none';
    document.getElementsByTagName('body')[0].appendChild(link);
    link.click();
    document.getElementsByTagName('body')[0].removeChild(link);
};

// var getRawInputRows = function() {
//     var rawInputRows = [];
//     $('.entryLines').each(function(){
//         var row = [];
//         $(this).find('input').each(function(colNum){
//             row.push($(this).val().trim());
//         });
//         rawInputRows.push(row);
//     });
//     return rawInputRows;
// };


function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object

    // Check if json then list some properties.
    var output = [];
    var isJson = false;
    for (var i = 0, f; f = files[i]; i++) {
        if (f.name.indexOf("json") !== -1) {
            output.push('<div id="fileStats"><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
                f.size, ' bytes, last modified: ',
                f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
                '</div>');
        }
        else{
            alert("File must be a valid GTM json export");
            throw new Error ("File must be a valid GTM json export");
        }

    }
    document.getElementById('list').innerHTML = '<div>' + output.join('') + '</div>';
    document.getElementById('options').innerHTML ='<input name="filename" id="filename" type="text" placeholder="GTM_Export"/><select class="selectpicker"><option>.xlsx</option><option>.csv</option></select>'
    document.getElementById('parse').innerHTML = '<button id="parseButton" type="button">Download</button>';

    // begin parsing
    document.getElementById("parseButton").addEventListener("click", function() {
        // Read in the file as Text.
        for (var i = 0; i < files.length; ++i) {
            var file = files[i];
            var reader = new FileReader();
            reader.onload = function(e) {
                var text = reader.result;
                var jsonData = JSON.parse(text);
                console.log(jsonData);

                // set up map of trigger ids and names
                var triggers = jsonData["containerVersion"]["trigger"];
                var triggerMap = new Map();
                for (var t = 0; t < triggers.length; ++t) {
                    triggerMap.set(triggers[t]["triggerId"],triggers[t]["name"]);
                }

                // set up map of folder ids and names
                var folders = jsonData["containerVersion"]["folder"];
                var folderMap = new Map();
                for (var f = 0; f < folders.length; ++f){
                    folderMap.set(folders[f]["folderId"],folders[f]["name"]);
                }

                // init arrays of params
                var trig_names = [];
                var folder_names = [];
                var tag_names = [];
                var event_categories = [];
                var event_actions = [];
                var event_labels = [];

                // loop through tags
                var tags = jsonData["containerVersion"]["tag"];
                // filter out tags that have no parameter
                for (var g = 0; g < tags.length; ++g){
                    if (!('parameter' in tags[g])){
                        tags.splice(g,1);
                    }

                    // push tag names
                    tag_names.push(tags[g]["name"]);

                    // push event naming
                    var hasEvent = false;
                    var parameters = tags[g]["parameter"];
                    for (var p = 0; p < parameters.length; ++p){
                        if ('eventCategory' == parameters[p]["key"]){
                            event_categories.push(parameters[p]["value"]);
                            hasEvent = true;
                        }
                        else if ('eventAction' == parameters[p]["key"]) {
                            event_actions.push(parameters[p]["value"]);
                        }
                        else if ('eventLabel' == parameters[p]["key"]) {
                            event_labels.push(parameters[p]["value"]);
                        }
                    }

                    // placeholder for case where tag has no events
                    if (false == hasEvent){
                        event_categories.push("NA");
                        event_actions.push("NA");
                        event_labels.push("NA");
                    }

                    // lookup trigger / folder ids in respective maps
                    var trig_set = [];
                    var triggerIds = tags[g]["firingTriggerId"];
                    for (var s = 0; s < triggerIds.length; ++s){
                        if (triggerMap.has(triggerIds[s])){
                            trig_set.push(triggerMap.get(triggerIds[s]));
                        }
                        else {
                            trig_set.push("NA");
                        }
                    }
                    trig_names.push(trig_set.toString());
                    if ('parentFolderId' in tags[g]){
                        folder_names.push(folderMap.get(tags[g]['parentFolderId']));
                    }
                    else {
                        folder_names.push("NA");
                    }
                }

                // stuff here
                try{
                    var formatSelect = document.querySelector('.selectpicker');
                    var format = formatSelect.options[formatSelect.selectedIndex].text;
                    var parameterList= [folder_names,tag_names,event_categories,event_actions,event_labels,trig_names];
                    var lines = [];

                    // header line
                    if (format == ".xlsx"){
                        lines.push(['Folder Name','Tag Name','Event Category','Event Action','Event Label','Trigger']);
                    }else{
                        lines.push(['Folder Name','Tag Name','Event Category','Event Action','Event Label','Trigger'].join(','));
                    }

                    // content lines
                    for (var l = 0; l < folder_names.length; ++l){
                        var row = [];
                        for (var m = 0; m < parameterList.length; ++m) {
                            if (format == ".xlsx") {
                                row.push(parameterList[m][l]);
                            } else {
                                row.push(parameterList[m][l]);
                            }
                        }
                        if (format == ".xlsx") {
                            lines.push(row);
                        } else {
                            lines.push(row.join(','));
                        }
                    }
                    var fileNameInput = document.getElementById("filename");
                    if (format == ".xlsx"){
                        var wb = new Workbook(), ws = sheet_from_array_of_arrays(lines);
                        var filename = (fileNameInput.value || fileNameInput.getAttribute("placeholder"));
                        wb.SheetNames.push(filename);
                        wb.Sheets[filename] = ws;
                        var wbout = XLSX.write(wb, {bookType:'xlsx', bookSST:true, type: 'binary'});
                        saveAs(new Blob([s2ab(wbout)],{type:"application/octet-stream"}), filename + ".xlsx")
                    }else{
                        var csv = lines.join('\n');
                        var filename = (fileNameInput.value || fileNameInput.getAttribute("placeholder")) + ".csv";
                        downloadData('text/csv;charset=utf-8', csv, filename);
                    }
                }
                catch(e){
                    alert(e)
                }
            };
          reader.readAsText(file);
        }
    });
  }

document.getElementById('files').addEventListener('change', handleFileSelect, false);
