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

    const frequency = analogSignalFrequency; 
    if (isNaN(value) || value < 2 * frequency) {
        errorMessageElement.textContent = `La frecuencia de muestreo debe ser mayor o igual que el doble de la frecuencia de la señal (${(2 * frequency).toFixed(2)} Hz).`;
        
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
    analogSignalFrequency = Math.random() * 10 + 1; 
    time = Array.from({ length: 1000 }, (_, i) => i / 100);

    analogSignal = time.map(t => amplitude * Math.sin(2 * Math.PI * analogSignalFrequency * t + phase));

    const frequencyElement = document.getElementById('signalFrequency');
    frequencyElement.textContent = analogSignalFrequency.toFixed(2);

    const samplingRateInput = document.getElementById('samplingRate');
    const recommendedSamplingRate = analogSignalFrequency * 2;
    samplingRateInput.value = Math.ceil(recommendedSamplingRate);

    plotSignal();
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

    const layout = {
        title: 'Señales PCM',
        xaxis: {
            title: 'Tiempo (s)',
            range: [0, 2] // Mostrar solo de 0 a 2 en el eje X
        },
        yaxis: { title: 'Amplitud' },
        showlegend: true
    };

    Plotly.newPlot('plot', data, layout);
}

function plotQuantizationLevels(quantizationLevels) {
    // Calcular los valores mínimos y máximos de la señal original
    const minVal = Math.min(...analogSignal);
    const maxVal = Math.max(...analogSignal);

    // Calcular el tamaño del paso para cada nivel de cuantificación
    const stepSize = (maxVal - minVal) / quantizationLevels;

    // Crear los niveles de cuantificación basados en el valor mínimo, máximo y los niveles de cuantificación
    const levels = Array.from({ length: quantizationLevels }, (_, i) => minVal + i * stepSize);
    
    // Número de bits para la representación binaria de los niveles
    const bits = Math.ceil(Math.log2(quantizationLevels));

    // Crear los trazos de los niveles de cuantificación
    const levelTraces = levels.map((level, index) => ({
        x: [time[0], time[time.length - 1]], // Usamos el rango completo de tiempo para los niveles
        y: [level, level], // El nivel se dibuja horizontalmente en la gráfica
        mode: 'lines+text',
        line: { dash: 'dot', color: 'gray' }, // Línea discontinua gris para cada nivel
        name: `Nivel ${index}`,
        text: [`${index.toString(2).padStart(bits, '0')}`], // Representación binaria del nivel
        textposition: 'top right',
        showlegend: false
    }));

    // Agregar solo los trazos de los niveles de cuantificación al gráfico
    Plotly.addTraces('plot', levelTraces);
}

function processPCM() {
    const samplingRate = parseFloat(document.getElementById('samplingRate').value);
    const quantizationLevels = parseInt(document.getElementById('quantizationLevels').value);
    
    const frequency = analogSignalFrequency; 

    // Muestreo
    const step = Math.floor(time.length / (time.length * samplingRate / 100));
    sampledSignal = time
        .filter((_, i) => i % step === 0)
        .map((t, i) => [t, analogSignal[i * step]]);

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

    // Actualizar gráficas y mostrar tabla
    updateGraph();
    plotQuantizationLevels(quantizationLevels);
    displayBinarySignal();
}

function displayBinarySignal() {
    const binaryContainer = document.getElementById('binaryOutput');
    binaryContainer.innerHTML = ''; // Limpiar contenido previo

    // Crear tabla
    const table = document.createElement('table');
    table.border = '1';
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>N° muestra</th><th>Codificación Binaria</th>';
    table.appendChild(headerRow);

    // Mostrar los 20 primeros valores binarios
    binarySignal.slice(0, 10).forEach(({ binary }, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${index + 1}</td><td>${binary}</td>`;
        table.appendChild(row);
    });

    binaryContainer.appendChild(table);
}

function updateGraph() {
    const sampledX = sampledSignal.map(([t]) => t);
    const sampledY = sampledSignal.map(([, value]) => value);

    Plotly.update('plot', {
        x: [time, sampledX],
        y: [analogSignal, sampledY]
    });
}

// Eventos
document.getElementById('generateSignal').addEventListener('click', generateRandomSignal);
document.getElementById('processPCM').addEventListener('click', processPCM);

// Generar señal inicial
generateRandomSignal();
