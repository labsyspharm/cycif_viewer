let channelData;
let sortable;
let elem1, elem2;

function channelMatch(data) {
    channelData = data;
    const leftList = document.getElementById('left-list');
    const middleList = document.getElementById('middle-list');
    const rightList = document.getElementById('right-list');
    document.getElementById('save').onclick = submitForm;

    let idField = _.get(data, 'idField', true);
    let channelFiles = _.get(data, 'channelFileNames', [])
    _.each(channelFiles, (channel, i) => {
        if (i === 0 && idField && channel == 'ID') {
            leftList.innerHTML += `<div class="list-group-item tinted destination optional">${channel} (Optional)<span class="fa fa-times remove" aria-hidden="true"></span></div>`
        } else {
            leftList.innerHTML += `<div class="list-group-item tinted destination">${channel}</div>`
        }
    });

    $(".destination").on('click', '.remove', function () {
        $(this).parent().remove();
        // Remove an arrow as well
        $('#middle-list .list-group-item:eq(0)').remove();
    });

    _.times(leftList.childElementCount, () => {
        middleList.innerHTML += `<div class="list-group-item arrow-between-columns">⟶</div>`
    });

    let headers = _.get(data, 'csvHeader', []);
    if (_.get(data, 'new', false)) {
        let val;

        // Y Position
        let yIndex = _.findIndex(headers, e => {
            let str = _.get(e, 'fullName') || e;
            return str == 'CellPosition_Y' || str == 'Y_centroid'
        });
        if (yIndex != -1) {
            val = headers[yIndex]
            _.pullAt(headers, [yIndex])
            headers = _.concat(val, headers)
        }

        // X Position
        let xIndex = _.findIndex(headers, e => {
            let str = _.get(e, 'fullName') || e;
            return str == 'CellPosition_X' || str == 'X_centroid'
        });
        if (xIndex != -1) {
            val = headers[xIndex]
            _.pullAt(headers, [xIndex])
            headers = _.concat(val, headers)
        }

        // Area Position
        // X Position
        let areaIndex = _.findIndex(headers, e => {
            let str = _.get(e, 'fullName') || e;
            return str == 'NucleusArea' || str == 'Area'
        });
        if (areaIndex != -1) {
            val = headers[areaIndex]
            _.pullAt(headers, [areaIndex])
            headers = _.concat(val, headers)
        }

        // CellId Position
        let cellIdIndex = _.findIndex(headers, e => {
            let str = _.get(e, 'fullName') || e;
            return str == 'CellID';
        });
        if (cellIdIndex != -1) {
            val = headers[cellIdIndex]
            _.pullAt(headers, [cellIdIndex])
            headers = _.concat(val, headers)
        }

    }

    _.each(headers, (header, i) => {
        let fullName = _.get(header, 'fullName') || header;
        let displayName = _.get(header, 'displayName', fullName);
        rightList.innerHTML +=
            `<div class="list-group-item card justify-content-center channel">
                <div class="form-group row">
                    <label for="fullName${i}"   class="col-auto col-form-label">Full Name&nbsp;</label>
                    <input type="text" readonly class="form-control-plaintext col-4" id="fullName${i}"  name="fullName${i}"value="${fullName}">
                    <label for="name${i}"   class="col-auto col-form-label">Display Name&nbsp;</label>
                    <span class="form-control shortname col-3" id="name${i}">${displayName}</span>
                    <label for="normalize${i}"   class="col-form-label col-sm-auto normalize-label">Normalize&nbsp;</label>
                    <input type="checkbox" class="normalize-checkbox col-sm-auto" id="normalize${i}" name="normalize${i}">
                </div>   
            </div>`

    });
    $('.shortname').attr('contentEditable', true);
// Taken from pre_normalization csv
    let markers_notToNorm = ['Field_Row', 'Field_Col', 'CellID', 'X_position', 'Y_position', 'Percent_Touching', 'Number_Neighbors', 'Neighbor_1', 'Neighbor_2', 'Neighbor_3', 'Neighbor_4', 'Neighbor_5', 'Eccentricity', 'Solidity', 'Extent', 'EulerNumber', 'Perimeter', 'MajorAxisLength', 'MinorAxisLength', 'Orientation', 'X_position', 'Y_position']
    _.each(headers, (header, i) => {
        let fullName = _.get(header, 'fullName') || header;
        if (!_.includes(markers_notToNorm, fullName)) {
            $(`#normalize${i}`).prop('checked', true);
        }
    });
    let normalizeCsvName = _.get(data, 'normCsvName');
    let normalizeCsv = _.get(data, 'normalize_csv', true);
    $('.normalize-label').hide();
    $('.normalize-checkbox').hide();
    if ((normalizeCsvName && normalizeCsvName != '') || normalizeCsv == false) {
        $('#normalize-csv').prop('checked', false)
        $('.normalize-label').hide();
        $('.normalize-checkbox').hide();
        $('.normalize-form').hide();
    }


    $('#normalize-csv').change(function () {
        if ($(this).is(":checked")) {
            $('.normalize-label').show();
            $('.normalize-checkbox').show();
        } else {
            $('.normalize-label').hide();
            $('.normalize-checkbox').hide();
        }
    });


    sortable = new Sortable(rightList, {
        animation: 150,
        ghostClass: 'blue-background-class'
    });
    initializeSwap();

    const markInstance = new Mark(document.querySelector("#right-list"));
    const markOptions = {
        exclude: ['label, input']
    };
    $("#substring").bind("change paste keyup", function () {
        let val = $(this).val();
        markInstance.unmark({
            done: function () {
                markInstance.mark(val, markOptions);
            }
        });
    });
    let substring = _.get(data, 'substring');
    if (substring) {
        $('#substring').val(substring);
        markInstance.mark(substring, markOptions);
    }
    $("#remove-substring").click(function () {
        let stringToRemove = $('#substring').val();
        _.each($('#right-list span'), span => {
            let spanText = $(span).text();
            spanText = spanText.replace(stringToRemove, '');
            $(span).text(spanText);
        });
    });


}

function initializeSwap() {
    $('.channel').on('click', function (e) {
        if ($(e.target).hasClass('form-control')) {
            $('.channel').removeClass('channel-hover');
            removeSelections();
        } else {
            if (!elem1) {
                elem1 = this;
                console.log("Swap");
                $(elem1).addClass('selected');
                $('.channel').addClass('channel-hover');
            } else {
                if ($(elem1).is($(this))) {
                    console.log("same element")
                    return;
                }
                elem2 = this;
                $(elem2).addClass('selected');
                sortable.captureAnimationState();
                swapNodes(elem1, elem2);
                sortable.animateAll();
                removeSelections();
            }
        }
    })
    $('.destination').on('click', function (e) {
        let index = $('.destination').index(this);
        removeSelections();
        elem1 = $('.channel').eq(index)[0];
        $(elem1).addClass('selected');
        $('.channel').addClass('channel-hover');
    })
}

function removeSelections() {
    $('.channel').removeClass('channel-hover');
    if (elem1) {
        $(elem1).removeClass('selected');
        elem1 = null;
    }
    if (elem2) {
        $(elem2).removeClass('selected');
        elem2 = null;
    }
}

function serializeForm() {
    let serializedForm = [];
    _.map($('.form-group'), elem => {
        // let labels =  $(elem).find('label');
        let inputs = $(elem).find('input, .shortname');
        _.map(inputs, input => {
            let elem = {}
            elem['name'] = input.id;
            if ($(input).hasClass('normalize-checkbox')) {
                if ($(input).prop('checked')) {
                    elem['value'] = 'on';
                } else {
                    elem['value'] = 'off'
                }

            } else {
                elem['value'] = input.value || input.textContent;
            }
            serializedForm.push(elem)
        })
    })
    return serializedForm;
}

function submitForm() {
    console.log(channelData);
    let headerList = serializeForm();
    document.getElementById('save').innerHTML += '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'

    let postData = {
        originalData: channelData,
        headerList: headerList,
        normalizeCsv: $('#normalize-csv').is(':checked'),
        normalizeCsvName: _.get(channelData, 'normCsvName')
    };

    if ($('.optional') && $('.optional').is(":visible")) {
        console.log('Adding ID Field');
        postData['idField'] = headerList.splice(0, 3);
    } else {
        if (_.get(channelData.channelFileNames, '[0]', '') == "ID") {
            channelData.channelFileNames = _.tail(channelData.channelFileNames);
        }
    }
    $.ajax("/save_config", {
        data: JSON.stringify(postData),
        contentType: "application/json",
        type: "POST",
        success: function (result) {
            window.location = '/' //Redirect to main after successful upload
        }
    });
}

//Function via https://github.com/SortableJS/Sortable/blob/master/src/utils.js
function index(el, selector) {
    let index = 0;

    if (!el || !el.parentNode) {
        return -1;
    }

    /* jshint boss:true */
    while (el = el.previousElementSibling) {
        if ((el.nodeName.toUpperCase() !== 'TEMPLATE') && el !== Sortable.clone && (!selector || matches(el, selector))) {
            index++;
        }
    }

    return index;
}

//Function via https://github.com/SortableJS/Sortable/blob/master/plugins/Swap/Swap.js
function swapNodes(n1, n2) {
    console.log("Swapping");
    let p1 = n1.parentNode,
        p2 = n2.parentNode,
        i1, i2;

    if (!p1 || !p2 || p1.isEqualNode(n2) || p2.isEqualNode(n1)) return;

    i1 = index(n1);
    i2 = index(n2);

    if (p1.isEqualNode(p2) && i1 < i2) {
        i2++;
    }
    p1.insertBefore(n2, p1.children[i1]);
    p2.insertBefore(n1, p2.children[i2]);
}