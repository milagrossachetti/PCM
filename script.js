let analogSignal = [];
let time = [];
let sampledSignal = [];
let quantizedSignal = [];
let binarySignal = []; // Global para almacenar codificación binaria

// Generar señal senoidal aleatoria con amplitud y fase variables
function generateRandomSignal() {
    const amplitude = Math.random() * 2; 
    const phase = Math.random() * 2 * Math.PI; // Fase entre 0 y 2π
    time = Array.from({ length: 1000 }, (_, i) => i / 100); // 10 segundos

    // Señal senoidal con amplitud y fase variables
    analogSignal = time.map(t => amplitude * Math.sin(2 * Math.PI * 1 * t + phase));

    plotSignal();
}

// Graficar señal en Plotly
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
    const samplingRate = parseInt(document.getElementById('samplingRate').value);
    const quantizationLevels = parseInt(document.getElementById('quantizationLevels').value);

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
        // Calcular el nivel inferior
        let level = Math.floor((value - minVal) / stepSize);

        // Limitar el nivel a los valores válidos (0 a quantizationLevels - 1)
        level = Math.max(0, Math.min(level, quantizationLevels - 1));

        // Calcular el valor cuantificado correspondiente
        const quantizedValue = level * stepSize + minVal;
        return [t, quantizedValue, level];
    });

    // Codificación binaria
    const bits = Math.ceil(Math.log2(quantizationLevels));
    binarySignal = quantizedSignal.map(([t, quantizedValue, level]) => {
        const binary = level.toString(2).padStart(bits, '0'); // Nivel codificado en binario
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


// Actualizar gráficas en Plotly
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
