import React, { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';

function checkPower(base, exponent) {
  if (exponent === 0) {
    return [1];
  }
  // Handle special cases
  if (base === 0 && exponent <= 0) return NaN;
  if (exponent === 0) return 1;

  // For positive bases, use regular Math.pow
  if (base > 0) {
    return [Math.pow(base, exponent)];
  }

  // For negative bases
  if (base < 0) {
    // If exponent is an integer
    if (Number.isInteger(exponent)) {
      return [Math.pow(base, exponent)];
    }

    // Convert exponent to fraction for analysis
    const tolerance = 1e-10;
    let numerator = 1, denominator = 1;
    let foundFraction = false;

    // Find fractional representation
    for (let d = 1; d <= 100; d++) {
      const n = Math.round(exponent * d);
      if (Math.abs(n / d - exponent) < tolerance) {
        numerator = n;
        denominator = d;
        foundFraction = true;
        break;
      }
    }

    if (!foundFraction) {
      return [NaN];
    }

    // Simplify fraction
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const div = gcd(Math.abs(numerator), denominator);
    numerator = numerator / div;
    denominator = denominator / div;

    // Calculate the absolute result
    const absResult = Math.pow(Math.abs(base), exponent);

    if (denominator % 2 === 1) {
      // Odd root
      return [-absResult];
    } else {
      // Even root - return both positive and negative values
      if (numerator % 2 === 1) {
        // Odd numerator - both roots are valid
        return [absResult, -absResult];
      } else {
        // Even numerator - only positive root is valid
        return [absResult];
      }
    }
  }

  return [NaN];
}

const EquationPlotter = () => {
  const [showGraph, setShowGraph] = useState(false);
  const [equation, setEquation] = useState({ type: 'y', expression: 'x' });
  const [error, setError] = useState('');
  const [rangeType, setRangeType] = useState('auto');
  const [range, setRange] = useState({ start: -10, end: 10 });
  const [showHelp, setShowHelp] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 800);

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const validateExpression = (expr, type) => {
    // Check for recursive self-reference
    const variable = type;
    const otherVar = type === 'y' ? 'x' : 'y';

    // Replace all non-variable occurrences of x/y first
    const cleanExpr = expr.replace(/([a-zA-Z_][a-zA-Z0-9_]*)/g, (match) => {
      if (match === 'x' || match === 'y') return match;
      return '1'; // Replace other identifiers with 1 for validation
    });

    // Check for direct self-reference
    if (cleanExpr.includes(variable)) {
      const terms = cleanExpr.split(/[\+\-\*\/\(\)]/);
      const hasSelfReferenceOnly = terms.some(term => term.trim() === variable);
      if (hasSelfReferenceOnly) return false;
    }

    return true;
  };

  const generatePoints = (equation, range) => {
    if (!equation.expression.trim()) {
      setError('Please enter an equation');
      return { x: [], y: [] };
    }

    if (!validateExpression(equation.expression, equation.type)) {
      setError('Invalid equation: contains direct self-reference');
      return { x: [], y: [] };
    }


    try {
      const points = { x: [], y: [] };
      const { start, end } = range;


      const isPowerWithNegativeBase = equation.expression.match(/pow\s*\(\s*-\d+/);
      const step = isPowerWithNegativeBase ? 1 : (end - start) / 200;

      const evalExpr = (expr, vars) => {
        const mathFuncs = {
          sin: Math.sin, cos: Math.cos, tan: Math.tan,
          log: (x, base = Math.E) => Math.log(x) / Math.log(base),
          pow: (x, y) => checkPower(x, y),
          pi: Math.PI, e: Math.E,
          sqrt: Math.sqrt, abs: Math.abs
        };

        const safeEval = new Function(...Object.keys(vars), ...Object.keys(mathFuncs),
            `return ${expr.replace(/\^/g, '**')};`);
        const result = safeEval(...Object.values(vars), ...Object.values(mathFuncs));
        return Array.isArray(result) ? result : [result];
      };

      if (equation.type === 'y') {
        for (let x = start; x <= end; x += step) {
          try {
            const yValues = evalExpr(equation.expression, { x });
            yValues.forEach(y => {
              if (!isNaN(y) && isFinite(y)) {
                points.x.push(x);
                points.y.push(y);
              }
            });
          } catch {}
        }
      } else {
        for (let y = start; y <= end; y += step) {
          try {
            const xValues = evalExpr(equation.expression, { y });
            xValues.forEach(x => {
              if (!isNaN(x) && isFinite(x)) {
                points.y.push(y);
                points.x.push(x);
              }
            });
          } catch {}
        }
      }

      if (points.x.length === 0) {
        setError('Error: Unable to generate valid points for the equation.');
        return points;
      }

      setError('');
      return points;
    } catch (err) {
      setError('Invalid equation. Please check syntax.');
      return { x: [], y: [] };
    }
  };

  const plotData = useMemo(() => generatePoints(equation, range), [equation, range]);

  const style = {
    container: {
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '10px',
      background: '#1a1a1a',
      color: '#fff',
      boxSizing: 'border-box'
    },
    header: {
      textAlign: 'center',
      marginBottom: '20px',
      fontSize: windowWidth < 600 ? '1.5em' : '2em'
    },
    card: {
      border: '1px solid #333',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '20px',
      background: '#2d2d2d',
      width: '100%',
      boxSizing: 'border-box'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: windowWidth < 600 ? 'column' : 'row',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '15px',
      width: '100%'
    },
    select: {
      padding: '8px',
      background: '#333',
      color: '#fff',
      border: '1px solid #444',
      borderRadius: '4px',
      width: windowWidth < 600 ? '100%' : 'auto'
    },
    input: {
      padding: '8px',
      background: '#333',
      color: '#fff',
      border: '1px solid #444',
      borderRadius: '4px',
      width: '100%',
      boxSizing: 'border-box',
      autocorrect: 'none'
    },
    button: {
      backgroundColor: '#0066cc',
      color: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '4px',
      cursor: 'pointer',
      width: windowWidth < 600 ? '100%' : 'auto'
    },
    helpButton: {
      backgroundColor: 'transparent',
      color: '#4da6ff',
      border: '1px solid #4da6ff',
      padding: '8px',
      borderRadius: '4px',
      cursor: 'pointer',
      marginBottom: '10px',
      width: windowWidth < 600 ? '100%' : 'auto'
    },
    error: {
      color: '#ff6b6b',
      marginTop: '10px',
      padding: '10px',
      backgroundColor: 'rgba(255,107,107,0.1)',
      borderRadius: '4px',
      textAlign: 'center',
      marginBottom: '10px',
    },
    equationDisplay: {
      textAlign: 'center',
      margin: '10px 0',
      fontSize: windowWidth < 600 ? '1em' : '1.2em',
      color: '#4da6ff',
      wordBreak: 'break-word'
    },
    helpText: {
      backgroundColor: '#333',
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '15px'
    }
  };

  const formulaHelp = (
      <div style={style.helpText}>
        <h3>Available Functions and Constants:</h3>
        <ul>
          <li>Basic operators: +, -, *, /, ^</li>
          <li>Math functions: sin(), cos(), tan(), sqrt(), abs()</li>
          <li>Logarithms: log(x, base) - default base is e</li>
          <li>Power: pow(base, exponent)</li>
          <li>Constants: pi, e</li>
        </ul>
        <h3>Examples:</h3>
        <ul>
          <li>y = sin(x) * pow(2, x)</li>
          <li>x = log(y + 1, e)</li>
          <li>y = sqrt(abs(x)) * pi</li>
        </ul>
      </div>
  );


  const darkPlotLayout = {
    width: windowWidth < 600 ? windowWidth - 40 : 760,
    height: windowWidth < 600 ? windowWidth - 40 : 500,
    title: '',
    paper_bgcolor: '#1e1e1e',
    plot_bgcolor: '#1a1a1a',
    margin: {
      l: 50,
      r: 30,
      t: 30,
      b: 50
    },
    xaxis: {
      title: 'X-axis',
      gridcolor: '#3c3c3c',
      zerolinecolor: '#ffffff',
      color: '#fff',
      range: [range.start, range.end],
      position: 'bottom'  // Ensure x-axis is at the bottom
    },
    yaxis: {
      title: 'Y-axis',
      gridcolor: '#3c3c3c',
      zerolinecolor: '#ffffff',
      color: '#fff',
      range: [range.start, range.end],
      position: 'left'  // Ensure y-axis is on the left
    },
    dragmode: 'pan'
  };

  const handleGenerateClick = (e) => {
    if (!error || e.shiftKey) {
      setShowGraph(true);
    }
  };

  if (!showGraph) {
    return (
        <div style={style.container}>
          <div style={style.header}>
            <h1 style={{color: '#c35528', margin: 0}}>Equation Plotter</h1>
          </div>

          <div style={style.card}>
            <div style={style.inputGroup}>
              <select
                  style={style.select}
                  value={equation.type}
                  onChange={(e) => setEquation(prev => ({...prev, type: e.target.value}))}
              >
                <option value="y">y</option>
                <option value="x">x</option>
              </select>
              <span>=</span>
              <input
                  style={style.input}
                  value={equation.expression}
                  onChange={(e) => setEquation(prev => ({...prev, expression: e.target.value}))}
                  placeholder="Enter equation (e.g., x^2, sin(x))"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  autoFocus="true"
              />
            </div>

            <div style={{display: 'flex', justifyContent: 'space-evenly', alignItems: 'center'}}>

              <div style={style.inputGroup}>

                <select
                    style={style.select}
                    value={rangeType}
                    onChange={(e) => setRangeType(e.target.value)}
                >
                  <option value="auto">Automatically Generate Range Of Numbers</option>
                  <option value="manual">Manually Decide Number Range</option>
                </select>

                {rangeType === 'manual' && (
                    <>
                      <input
                          style={style.input}
                          type="number"
                          onChange={(e) => setRange(prev => ({...prev, start: Number(e.target.value)}))}
                          placeholder="Start"
                      />
                      <input
                          style={style.input}
                          type="number"
                          onChange={(e) => setRange(prev => ({...prev, end: Number(e.target.value)}))}
                          placeholder="End"
                      />
                    </>
                )}
              </div>
            </div>

            {error && <div style={style.error}>{error}</div>}

            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <button
                  onClick={() => setShowHelp(!showHelp)}
              >
                {showHelp ? '?' : '?'}
              </button>
              <button
                  style={{
                    ...style.button,
                    opacity: error && !showGraph ? 0.5 : 1,
                    cursor: error && !showGraph ? 'not-allowed' : 'pointer'
                  }}
                  onClick={handleGenerateClick}
                  title={error ? "Hold Shift to override" : "Generate Graph"}
              >
                Generate Graph
              </button>
            </div>
          </div>
          {showHelp && formulaHelp}
        </div>
    );
  }

  return (
      <div style={style.container}>
        <Plot
            data={[{
              x: plotData.x,
              y: plotData.y,
              type: 'scatter',
              mode: 'lines+markers',
              line: {color: '#c35528'}
            }]}
            layout={darkPlotLayout}
            config={{
              responsive: true,
              scrollZoom: true,
              displayModeBar: true,
              modeBarButtonsToAdd: ['pan2d', 'select2d', 'lasso2d', 'autoScale2d']
            }}
            onRelayout={(layout) => {
              if (rangeType === 'auto' && layout['xaxis.range[0]'] !== undefined) {
                setRange({
                  start: layout['xaxis.range[0]'],
                  end: layout['xaxis.range[1]']
                });
              }
            }}
        />
        <div style={{
          ...style.card,
          display: 'flex',
          flexDirection: windowWidth < 600 ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 20px',
          marginTop: '20px',
        }}>
          <div style={{...style.equationDisplay, color: '#fff', margin: 0}}>
            <h2 style={{fontSize: windowWidth < 600 ? '1.2em' : '1.5em', margin: '10px 0'}}>
              <code>{`${equation.type.toUpperCase()} = ${(equation.expression).toString().toUpperCase()}`}</code>
            </h2>
          </div>
          <button
              style={{...style.button}}
              onClick={() => setShowGraph(false)}
          >
            Edit
          </button>
        </div>
      </div>
  );
};

export default EquationPlotter;