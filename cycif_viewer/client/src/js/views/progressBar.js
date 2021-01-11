let uploadPercentage = 0;
let ajaxForm = $('form').ajaxForm({
    uploadProgress: function (event, position, total, percentComplete) {
        uploadPercentage = percentComplete;
    },
    success: function (res) {
        document.write(res);
    }
});

function displayPercentage(totalPercentage, currentTask) {
    if (totalPercentage == 0) {
        $('.progress-bar-label').css('display', 'none');
    } else {
        $('.progress-bar-label').css('display', 'block');
    }
    $('.progress-bar').css('width', totalPercentage + '%').attr('aria-valuenow', totalPercentage);
    $("#progress-bar-percentage").text(totalPercentage + '%');
    $("#progress-bar-current-task").text(currentTask);
}

let consecutiveErrors = 0;
$('#upload_button').on('click', function () {
    uploadPercentage = 0;
    // Hide whatever header exists
    displayHeader('', false, true);
    var source = new EventSource("/progress");
    source.onmessage = function (event) {
        let data = JSON.parse(event.data);
        consecutiveErrors = 0;

        if (data.percentage < 0) {
            console.log("Error, Terminating");
            displayPercentage(0, '');
            if (data.currentTask) {
                displayHeader(data.currentTask, true)
            }
            source.close();
            return;
        }
        let combinedPercentage = (data.percentage + (uploadPercentage || 0)) / 2;
        console.log("Parsed Data:", data, "combinedPercentage", combinedPercentage, "UL P", uploadPercentage);
        displayPercentage(combinedPercentage, data.currentTask);
        if (combinedPercentage >= 100) {
            displayHeader("Upload and Conversion Complete", false);
            source.close();
        }
    }
    source.onerror = function (event) {
        consecutiveErrors += 1;
        if (consecutiveErrors > 10) {
            console.log("Error, Terminating");
            displayPercentage(0, '');
            displayHeader("Error", true);
            source.close();
        }
    }
});

function displayHeader(text, isError, hide = false) {
    if (hide) {
        $('#upload-message').empty()
    } else {
        if (isError) {
            $('#upload-message').empty()
            $('#upload-message').append("<span class='error'>" + text + "</span>");
        } else {
            $('#upload-message').empty()
            $('#upload-message').append("<span class='success'>" + text + "</span>");
        }
    }


}