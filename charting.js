

var dataSeries = {};
//chart reference to share later
var chart;
var state;


function csvJSON(csv) {

    var lines = csv.split("\n");

    var result = [];

    // NOTE: If your columns contain commas in their values, you'll need
    // to deal with those before doing the next step 
    // (you might convert them to &&& or something, then covert them back later)
    // jsfiddle showing the issue https://jsfiddle.net/
    var headers = lines[0].split(",");

    for (var i = 1; i < lines.length; i++) {

        var obj = {};
        var currentline = lines[i].split(",");

        for (var j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentline[j];
        }

        result.push(obj);

    }

    //return result; //JavaScript object
    return JSON.stringify(result); //JSON
}

function formatDate(date) {
    dateString = date.toString();
    return dateString.slice(0, 4) + "-" + dateString.slice(4, 6) + "-" + dateString.slice(6, 8);
}

function formatSeriesForPlot(timeId, valueId, data) {
    return data.map(row => {
        //date_string = row[timeId].toString();
        formatted_date = formatDate(row[timeId]);
        return {
            time: formatted_date, value: row[valueId]
        }
    });
}

function calculateAverage(data, window) {
    avgData = JSON.parse(JSON.stringify(data));

    for (i = avgData.length - 1; i >= window; i--) {
        avgSubTotal = 0;
        for (j = 0; j < window; j++) {
            avgSubTotal += avgData[i - j].value;
        }
        avgData[i].value = avgSubTotal / window;
    }

    //set remaining to null
    for (i = window - 1; i >= 0; i--) {
        avgData[i].value = null;
    }

    return avgData;
}

function addSeries(plotInfo) {
    //chartSeries['data'], chartSeries['title'], chartSeries['color'])

    const lineSeries = chart.addLineSeries(
        {
            color: plotInfo['color'],
            axisLabelVisible: true,
            title: plotInfo['title']
        });

    plotInfo['series'] = lineSeries;
    lineSeries.setData(plotInfo['data']);
    //return lineSeries;
}

function removeSeries(chartSeries) {
    if ("series" in chartSeries){
        chart.removeSeries(chartSeries['series']);
        delete chartSeries['series'];// = null;        
    }
}

function calculateQuotient(numeratorSeries, denominatorSeries) {
    results = [];
    for (i = 0; i < numeratorSeries.length; i++) {
        results.push({
            time: numeratorSeries[i].time,
            value: numeratorSeries[i].value / (.00001 + denominatorSeries[i].value)
        })
    }

    return results;
}

function removeAllSeries() {
    for (let seriesName in dataSeries) {
        removeSeries(dataSeries[seriesName]);
    }
}

function showSomeData() {
    if(!state){
        state = "ID"
    }

    const data_url = `https://api.covidtracking.com/v1/states/${state}/daily.json`;

    removeAllSeries();
    fetch(data_url)
        .then(response => {
            return response.json();
        })
        .then(jsonData => {
            removeAllSeries(dataSeries);
            dataSeries = {};
            ascendingChartData = jsonData.reverse();

            chartSeriesDeaths = formatSeriesForPlot("date", "deathIncrease", ascendingChartData);

            chartSeriesHosp = formatSeriesForPlot("date", "hospitalizedIncrease", ascendingChartData);

            chartSeriesPositive = formatSeriesForPlot("date", "positiveIncrease", ascendingChartData);

            avgDeaths = calculateAverage(chartSeriesDeaths, 7);
            avgHospitalizations = calculateAverage(chartSeriesHosp, 10);
            avgPositive = calculateAverage(chartSeriesPositive, 10);

            deathPerPositive = calculateQuotient(avgDeaths, avgPositive);

            if (!chart) {
                const chartDiv = document.getElementById('chart');
                chart = LightweightCharts.createChart(chartDiv, { width: chartDiv.offsetWidth, height: (window.innerHeight * 0.95) });
            }

            dataSeries["death"] = { "title": "Deaths", "data": chartSeriesDeaths, "color": "firebrick" };
            dataSeries["death.avg"] = { "title": "Average Deaths", "data": avgDeaths, "color": "orangered" };
            dataSeries["pos"] = { "title": "Pos Increase", "data": chartSeriesPositive, "color": "darkseagreen" };
            dataSeries["pos.avg"] = { "title": "Avg Pos Increase", "data": avgPositive, "color": "green" };
            dataSeries["hosp"] = { "title": "Hospitalizations", "data": chartSeriesHosp, "color": "orange" };
            dataSeries["hosp.avg"] = { "title": "Average Hospitalizations", "data": avgHospitalizations, "color": "salmon" };

            /*
                        seriesDeaths = addSeries(chart, chartSeriesDeaths, "Deaths", "firebrick")
                        seriesAvgDeath = addSeries(chart, avgDeaths, "Average Deaths", "orangered")
                        seriesHosp = addSeries(chart, chartSeriesHosp, "Hospitalizations", "orange")
                        seriesAvgHosp = addSeries(chart, avgHospitalizations, "Average Hospitalizations", "salmon")
                        seriesPos = addSeries(chart, chartSeriesPositive, "Positive Increase", "green")
                        seriesAvgPos = addSeries(chart, avgPositive, "Positive Increase", "darkseagreen")
            */

            showAppropriatePlots()
            //
            /* */

            /*
      const lineSeriesDeath = chart.addLineSeries(
          {
              color: 'green',
          axisLabelVisible: true,
          title: 'Deaths'
          });
      
      lineSeriesDeath.setData(chartSeriesDeaths); 
      
      const lineSeriesHosp = chart.addLineSeries(
          {
              color: 'blue',
          axisLabelVisible: true,
          title: 'Hospitalization'
          });
      
      lineSeriesHosp.setData(chartSeriesHosp);
      */
            //  console.log(data)
            //return data;
        });
}

function showAppropriatePlots() {
    var checkboxes = document.querySelectorAll('input[type=checkbox][name=plots]');
    for (var checkbox of checkboxes) {
        var chartSeries = dataSeries[checkbox.value];
        if (checkbox.checked) {
            addSeries(chartSeries)
        } else {
            removeSeries(chartSeries);
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    var checkboxes = document.querySelectorAll('input[type=checkbox][name=plots]');

    for (var checkbox of checkboxes) {
        checkbox.addEventListener('change', function (event) {
            var chartSeries = dataSeries[event.target.value];
            if (event.target.checked) {
                addSeries(chartSeries)
            } else {
                removeSeries(chartSeries);
            }
        });
    }

    const stateSelect = document.getElementById('state-select')
    stateSelect.addEventListener('change', function (event) {
        state = event.target.value;

        showSomeData();
    });

}, false);

showSomeData();