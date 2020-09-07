

var ctx = document.getElementById('linechart1');

var data = JSON.parse(ctx.dataset.chartviz)

var userCountByMonthLabels = []
var userCountByMonthDataResults = []

for(var i=0;i<data.length;i++){
    var date = new Date((data[i]._id.year), (data[i]._id.month - 1), 1)
    var month = date.toLocaleString('default', {month: 'long'})

    userCountByMonthLabels.push(month)

    userCountByMonthDataResults.push(data[i].nb)
}

var firstChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: userCountByMonthLabels,
        datasets: [{
            data: userCountByMonthDataResults,
            backgroundColor: '#f8c291',
            borderColor: '#e55039'
        }]
    },
    options: {
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true
                }
            }]
        },
        legend: {
            display: false,
        }
    }
});

var ctx2 = document.getElementById('linechart2');

var data = JSON.parse(ctx2.dataset.chartviz)

var cmdCountByMonthLabels = []
var cmdCountByMonthDataResults = []

for(var i=0;i<data.length;i++){
    var date = new Date((data[i]._id.year), (data[i]._id.month - 1), 1)
    var month = date.toLocaleString('default', {month: 'long'})

    cmdCountByMonthLabels.push(month)

    cmdCountByMonthDataResults.push(data[i].nb)
}

var firstChart = new Chart(ctx2, {
    type: 'line',
    data: {
        labels: cmdCountByMonthLabels,
        datasets: [{
            data: cmdCountByMonthDataResults,
            backgroundColor: '#f8c291',
            borderColor: '#e55039'
        }]
    },
    options: {
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true
                }
            }]
        },
        legend: {
            display: false,
        }
    }
});