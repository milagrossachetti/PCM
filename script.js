let analogSignal = [];
let time = [];
let sampledSignal = [];
let quantizedSignal = [];
let binarySignal = [];
let analogSignalFrequency = 0;

document.getElementById('samplingRate').addEventListener('input', (event) => {
    let value = parseFloat(event.target.value);
    const errorMessageElement = document.getElementById('samplingRateError'); 

    errorMessageElement.textContent = '';
    if (value > 1000) {
        errorMessageElement.textContent = `La frecuencia de muestreo no debe exceder 1000 Hz.`;
        document.getElementById('processPCM').disabled = true;
        return;
    }
    const frequency = analogSignalFrequency; 
    if (isNaN(value) || value < 2 * frequency) {
        errorMessageElement.textContent = `La frecuencia de muestreo debe ser mayor o igual que el doble de la frecuencia de la señal (${(2 * frequency)} Hz).`;
        
        document.getElementById('processPCM').disabled = true;
    } else {
        document.getElementById('processPCM').disabled = false;
    }
});

document.getElementById('quantizationLevels').addEventListener('input', (event) => {
    let value = parseInt(event.target.value);
    const errorMessageElement = document.getElementById('quantizationLevelsError'); 

    errorMessageElement.textContent = '';

    if (isNaN(value) || value < 2 || (value & (value - 1)) !== 0) {
        errorMessageElement.textContent = 'Por favor, ingrese un valor que sea una potencia de 2 (por ejemplo, 2, 4, 8, 16).';
        
        document.getElementById('processPCM').disabled = true;
    } else {
        document.getElementById('processPCM').disabled = false;
    }
});

function generateRandomSignal() {
    const amplitude = Math.random() * 2; 
    const phase = Math.random() * 2 * Math.PI;
    analogSignalFrequency = Math.round(Math.random() * 10 + 1); 
    time = [];

    const numPoints = 10000; // Número de puntos de la señal
    const chunkSize = 1000; // Tamaño del fragmento a procesar a la vez
    const frequencyElement = document.getElementById('signalFrequency');
    frequencyElement.textContent = analogSignalFrequency;

    const samplingRateInput = document.getElementById('samplingRate');
    const recommendedSamplingRate = analogSignalFrequency * 2;
    samplingRateInput.value = recommendedSamplingRate;

    function generateChunk(startIndex) {
        let endIndex = Math.min(startIndex + chunkSize, numPoints);
        for (let i = startIndex; i < endIndex; i++) {
            time.push(i / 1000);
            analogSignal.push(amplitude * Math.sin(2 * Math.PI * analogSignalFrequency * (i / 1000) + phase));
        }
        if (endIndex < numPoints) {
            requestAnimationFrame(() => generateChunk(endIndex)); // Llamada asíncrona para el siguiente fragmento
        } else {
            plotSignal(); // Una vez terminada la generación, dibujar la señal
        }
    }

    generateChunk(0); // Iniciar la generación en fragmentos
}

function plotSignal() {
    const data = [
        {
            x: time,
            y: analogSignal,
            name: 'Señal Analógica',
            mode: 'lines',
            line: { color: 'blue' }
        },
        {
            x: [],
            y: [],
            name: 'Muestras',
            mode: 'markers',
            marker: { color: 'red' }
        }
    ];

    // Aquí se ajusta el rango del eje X según el tiempo total de la señal
    const layout = {
        title: 'Señales PCM',
        height: 900,
        xaxis: { 
            title: 'Tiempo (s)', 
            range: [-0.25, 1] // Ajustar el rango para cubrir todo el tiempo generado
        },
        yaxis: { title: 'Amplitud' },
        showlegend: true,
        dragmode: 'pan', // Permitir desplazamiento
        autosize: true // Hacer que la gráfica se ajuste automáticamente
    };

    // Crear la gráfica
    Plotly.newPlot('plot', data, layout);
}


function plotQuantizationLevels(quantizationLevels) {
    const minVal = Math.min(...analogSignal);
    const maxVal = Math.max(...analogSignal);
    const stepSize = (maxVal - minVal) / quantizationLevels;

    // Crear los niveles de cuantificación
    const levels = Array.from({ length: quantizationLevels }, (_, i) => minVal + i * stepSize);
    
    // Calcular el número de bits necesarios
    const bits = Math.ceil(Math.log2(quantizationLevels));

    // Crear trazos de niveles con bits alineados
    const levelTraces = levels.map((level, index) => ({
        x: [time[0], time[time.length - 1]], // Rango completo en el eje X
        y: [level, level], // Posición en el eje Y
        mode: 'lines+text',
        line: { dash: 'dot', color: 'gray', width: 1 }, // Línea discontinua
        name: `Nivel ${index}`,
        text: [`${index.toString(2).padStart(bits, '0')}`], // Bits representativos
        textposition: 'middle left', // Alinear texto con la línea
        showlegend: false
    }));

    // Agregar los trazos de los niveles de cuantificación al gráfico
    Plotly.addTraces('plot', levelTraces);
}


function processPCM() {
    const processingMessageElement = document.getElementById('processingMessage');
    processingMessageElement.style.display = 'block';

    setTimeout(() => {
        // Parámetros
        const samplingRate = parseFloat(document.getElementById('samplingRate').value);
        const quantizationLevels = parseInt(document.getElementById('quantizationLevels').value);

        if (isNaN(samplingRate) || samplingRate <= 0 || isNaN(quantizationLevels) || quantizationLevels <= 0) {
            console.error('Parámetros inválidos');
            processingMessageElement.style.display = 'none';  // Ocultar mensaje en caso de error
            return;
        }

        // Calcular el intervalo de muestreo
        const samplingInterval = 1 / samplingRate;
        const maxTime = time[time.length - 1];

        // Generar la señal muestreada
        sampledSignal = [];
        for (let t = 0; t <= maxTime; t += samplingInterval) {
            const closestIndex = Math.round(t / (time[1] - time[0]));
            if (closestIndex < analogSignal.length) {
                sampledSignal.push([t, analogSignal[closestIndex]]);
            }
        }

        // Cuantificación
        const minVal = Math.min(...analogSignal);
        const maxVal = Math.max(...analogSignal);
        const stepSize = (maxVal - minVal) / quantizationLevels;

        quantizedSignal = sampledSignal.map(([t, value]) => {
            let level = Math.floor((value - minVal) / stepSize);
            level = Math.max(0, Math.min(level, quantizationLevels - 1));
            const quantizedValue = level * stepSize + minVal;
            return [t, quantizedValue, level];
        });

        // Codificación binaria
        const bits = Math.ceil(Math.log2(quantizationLevels));
        binarySignal = quantizedSignal.map(([t, quantizedValue, level]) => {
            const binary = level.toString(2).padStart(bits, '0');
            return { t, quantizedValue, binary };
        });

        updateGraph();
        plotQuantizationLevels(quantizationLevels);
        displayBinarySignal();

        processingMessageElement.style.display = 'none';
    }, 0);  
}



function displayBinarySignal() {
    const binaryContainer = document.getElementById('binaryOutput');
    binaryContainer.innerHTML = ''; 

    const table = document.createElement('table');
    table.border = '1';
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>N° muestra</th><th>Codificación Binaria</th>';
    table.appendChild(headerRow);

    binarySignal.slice(0, 500).forEach(({ binary }, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${index + 1}</td><td>${binary}</td>`;
        table.appendChild(row);
    });

    binaryContainer.appendChild(table);
}

function updateGraph() {
    const sampledX = sampledSignal.map(([t]) => t);
    const sampledY = sampledSignal.map(([, value]) => value);

    Plotly.react('plot', [{
        x: time,
        y: analogSignal,
        name: 'Señal Analógica',
        mode: 'lines',
        line: { color: 'blue' }
    }, {
        x: sampledX,
        y: sampledY,
        name: 'Muestras',
        mode: 'markers',
        marker: { color: 'red' }
    }], {
        title: 'Señales PCM',
        height: 900,
        xaxis: {
            title: 'Tiempo (s)',
            range: [-0.25, 1]
        },
        yaxis: { title: 'Amplitud' },
        showlegend: true,
        dragmode: 'pan',
        autosize: true
    });
}


// Eventos
document.getElementById('generateSignal').addEventListener('click', generateRandomSignal);
document.getElementById('processPCM').addEventListener('click', processPCM);

// Generar señal inicial
generateRandomSignal();
