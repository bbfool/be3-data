var stateMap;  // will be initialized later when file is loaded
var colors;
const stateMapPath = "stateAbbrvMap.json";
const statePopPath = "statePopData.json";
const colorPath = "colors.json";

var dataSeries = {};
//chart reference to share later
var chart;
var state;

var plotInfo = {
    "deathIncrease": "Deaths",
    "hospitalizedIncrease": "Hospitalized",
    "positiveIncrease": "Positive"
}

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

function addToStateMap(popData) {
    var stateSelect = document.getElementById('state-select')

    for (let stateEntry in stateMap) {
        if (stateMap[stateEntry]["stateName"] in popData) {
            stateMap[stateEntry]['pop'] = popData[stateMap[stateEntry]["stateName"]]

            var option = document.createElement("option");
            option.text = stateMap[stateEntry]["stateName"];
            option.value = stateEntry;
            stateSelect.add(option);
        }
    }
    stateSelect.value = state;
}

function constructPlotSeries(plotId, plotTitle, plotData, plotColor) {
    var subPlots = {}
    subPlots[plotId] = {
        "title": plotTitle,
        "data": formatSeriesForPlot("date", plotId, plotData["mainDataSource"]),
        "color": plotColor
    }

    subPlots[plotId + ".avg"] = {
        "title": "Avg " + plotTitle,
        "data": calculateAverage(subPlots[plotId]["data"], 7),
        "color": lightenColor(plotColor, 50)
    }

    subPlots[plotId + ".byPop"] = {
        "title": plotTitle + " by Pop",
        "data": calculateQuotient(subPlots[plotId]["data"], plotData["populationDataSource"]),
        "color": lightenColor(plotColor, -50)
    }

    return subPlots;
}

function setUpPlots(chartDataSource) {

    var plottingData = {
        "mainDataSource": chartDataSource,
        "populationDataSource": constructPopulationSeries(state, chartDataSource.length)
    }
    var colorIndex = 0;
    for (let plot in plotInfo) {
        var subPlots = constructPlotSeries(
            plot,
            plotInfo[plot],
            plottingData,
            colors[colorIndex++]
        );

        for (let subPlot in subPlots) {
            dataSeries[subPlot] = subPlots[subPlot];
        }
    }

    //dataseries objects are populated, no need to return
}

function addBox(id, labelTitle, myDiv) {
    var checkbox = document.createElement('input');
    checkbox.type = "checkbox";
    checkbox.name = "plots";
    checkbox.value = id;
    checkbox.id = id;
    checkbox.checked = true;

    var label = document.createElement('label');

    label.htmlFor = id;
    label.appendChild(document.createTextNode(labelTitle));
    myDiv.appendChild(checkbox);
    myDiv.appendChild(label);

    console.log(`will add box for ${id} with title ${labelTitle}`)
}

function setupCheckBoxes() {
    var ctrlBoxes = document.getElementById('control-boxes');
    var controlBoxesDiv = document.getElementById("control-boxes");

    for (let plotName in plotInfo) {
        addBox(plotName, plotInfo[plotName], controlBoxesDiv);
        controlBoxesDiv.appendChild(document.createElement('br'));
        addBox(plotName + ".byPop", `${plotInfo[plotName]} by Pop`, controlBoxesDiv);
        controlBoxesDiv.appendChild(document.createElement('br'));
        addBox(plotName + ".avg", `Avg ${plotInfo[plotName]}`, controlBoxesDiv)
        controlBoxesDiv.appendChild(document.createElement('hr'));
    }
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
    //chartSeries['data'], chartSeries['title'], chartSeries['color']
    var chartColor = `#${plotInfo['color']}`.toUpperCase()
    const lineSeries = chart.addLineSeries(
        {
            color: chartColor, //${plotInfo['color']}
            axisLabelVisible: true,
            title: plotInfo['title']
        });

    plotInfo['series'] = lineSeries;
    lineSeries.setData(plotInfo['data']);
    //return lineSeries;
}

function removeSeries(chartSeries) {
    if ("series" in chartSeries) {
        chart.removeSeries(chartSeries['series']);
        delete chartSeries['series'];// = null;        
    }
}

function lightenColor(color, percent) {
    var num = parseInt(color.replace("#", ""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        B = (num >> 8 & 0x00FF) + amt,
        G = (num & 0x0000FF) + amt;
    return (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 + (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1).toUpperCase();
}

function calculateQuotient(numeratorSeries, denominatorSeries) {
    results = [];
    for (i = 0; i < numeratorSeries.length; i++) {
        results.push({
            time: numeratorSeries[i].time,
            value: numeratorSeries[i].value / (.00001 + denominatorSeries[i])
        })
    }

    return results;
}

function removeAllSeries() {
    for (let seriesName in dataSeries) {
        removeSeries(dataSeries[seriesName]);
    }
}

function constructPopulationSeries(state, length) {
    var population = stateMap[state]['pop'];
    //get population, construct an array of specified length
    return Array.apply(null, Array(length)).map(function () { return (population / 100000.0) });
}

function showSomeData() {
    
    if (plotsList) {
        console.log(`will be able to plot data for: ${plotsList}`)
    }

    const data_url = `https://api.covidtracking.com/v1/states/${state}/daily.json`;

    removeAllSeries();
    fetch(data_url, {mode: 'no-cors'})
        .then(response => {
            return response.json();
        })
        .then(jsonData => {
            removeAllSeries(dataSeries);
            dataSeries = {};
            ascendingChartData = jsonData.reverse();

            setUpPlots(ascendingChartData);
            /*
                        chartSeriesDeaths = formatSeriesForPlot("date", "deathIncrease", ascendingChartData);
            
                        chartSeriesHosp = formatSeriesForPlot("date", "hospitalizedIncrease", ascendingChartData);
            
                        chartSeriesPositive = formatSeriesForPlot("date", "positiveIncrease", ascendingChartData);
            
                        populationSeries = constructPopulationSeries(state, ascendingChartData.length)
            
                        deathsByPop = calculateQuotient(chartSeriesDeaths, populationSeries);
                        positiveByPop = calculateQuotient(chartSeriesPositive, populationSeries);
            
                        avgDeaths = calculateAverage(chartSeriesDeaths, 7);
                        avgHospitalizations = calculateAverage(chartSeriesHosp, 10);
                        avgPositive = calculateAverage(chartSeriesPositive, 10);
            
                        deathPerPositive = calculateQuotient(avgDeaths, avgPositive);
            */
            if (!chart) {
                const chartDiv = document.getElementById('chart');
                chart = LightweightCharts.createChart(chartDiv, { width: chartDiv.offsetWidth, height: (window.innerHeight * 0.95) });
            }
            /*
                        dataSeries["death"] = { "title": "Deaths", "data": chartSeriesDeaths, "color": "firebrick" };
                        dataSeries["death.avg"] = { "title": "Average Deaths", "data": avgDeaths, "color": "orangered" };
                        dataSeries["pos"] = { "title": "Pos Increase", "data": chartSeriesPositive, "color": "darkseagreen" };
                        dataSeries["pos.avg"] = { "title": "Avg Pos Increase", "data": avgPositive, "color": "green" };
                        dataSeries["hosp"] = { "title": "Hospitalizations", "data": chartSeriesHosp, "color": "orange" };
                        dataSeries["hosp.avg"] = { "title": "Average Hospitalizations", "data": avgHospitalizations, "color": "salmon" };
            */
            showAppropriatePlots()
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


if (!state) {
    state = "ID"
}

fetch(stateMapPath)
    .then(response => response.json())
    .then(json => {
        stateMap = {};
        for (let stateEntry in json) {
            stateMap[stateEntry] = { stateName: json[stateEntry] }
        }
    }
    )
    .then(() => fetch(statePopPath))
    .then(response => response.json())
    .then(popJson => { addToStateMap(popJson); }
    ).then(() => fetch(colorPath))
    .then(response => response.json())
    .then(colorsJson => { colors = colorsJson })
    .then(() => {
        setupCheckBoxes()
    })
    .then(() => {
        showSomeData();
    })
    .then(() => {

    });

