import math from 'mathjs';
// Math tool commands for CIARA-IV Bot
const mathCommands = {
    // Basic calculator
    calc: async (sock, msg, args) => {
        try {
            const expression = args.join(' ');
            if (!expression) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Please provide a mathematical expression\nExample: .calc 2 + 2 * 3'
                });
            }

            // Evaluate the expression safely
            const result = math.evaluate(expression);
            
            await sock.sendMessage(msg.key.remoteJid, {
                text: `🧮 *Calculator*\n\n📝 Expression: ${expression}\n📊 Result: ${result}\n\n✅ Calculated by CIARA-IV`
            });

        } catch (error) {
            console.error('Calc error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Invalid mathematical expression. Please check your input.'
            });
        }
    },

    // Calculate derivative
    derivative: async (sock, msg, args) => {
        try {
            const expression = args.join(' ');
            if (!expression) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Please provide a function to differentiate\nExample: .derivative x^2 + 3*x + 1'
                });
            }

            // Parse and differentiate the expression
            const expr = math.parse(expression);
            const derivative = math.derivative(expr, 'x');
            const simplified = math.simplify(derivative);

            await sock.sendMessage(msg.key.remoteJid, {
                text: `📈 *Derivative Calculator*\n\n🔢 Original: f(x) = ${expression}\n📐 Derivative: f'(x) = ${simplified.toString()}\n\n✅ Calculated by CIARA-IV`
            });

        } catch (error) {
            console.error('Derivative error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Error calculating derivative. Please check your function format.'
            });
        }
    },

    // Calculate integral
    integral: async (sock, msg, args) => {
        try {
            const expression = args.join(' ');
            if (!expression) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Please provide a function to integrate\nExample: .integral x^2 + 3*x + 1'
                });
            }

            // Note: mathjs doesn't have built-in integration, so we'll provide basic rules
            const basicIntegrals = {
                'x': 'x^2/2',
                'x^2': 'x^3/3',
                'x^3': 'x^4/4',
                '1': 'x',
                'sin(x)': '-cos(x)',
                'cos(x)': 'sin(x)',
                'e^x': 'e^x'
            };

            let result = basicIntegrals[expression] || 'Integration requires advanced calculus tools';

            await sock.sendMessage(msg.key.remoteJid, {
                text: `∫ *Integral Calculator*\n\n🔢 Function: ${expression}\n📐 Integral: ${result} + C\n\n✅ Calculated by CIARA-IV\n\n*Note: For complex integrations, consult advanced math tools*`
            });

        } catch (error) {
            console.error('Integral error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Error calculating integral. Please check your function format.'
            });
        }
    },

    // Factor polynomials
    factor: async (sock, msg, args) => {
        try {
            const expression = args.join(' ');
            if (!expression) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Please provide an expression to factor\nExample: .factor x^2 + 5*x + 6'
                });
            }

            // Parse and attempt to factor
            const expr = math.parse(expression);
            const factored = math.simplify(expr);

            await sock.sendMessage(msg.key.remoteJid, {
                text: `🔢 *Factorization*\n\n📝 Original: ${expression}\n📊 Factored: ${factored.toString()}\n\n✅ Processed by CIARA-IV`
            });

        } catch (error) {
            console.error('Factor error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Error factoring expression. Please check your input.'
            });
        }
    },

    // Matrix operations
    matrix: async (sock, msg, args) => {
        try {
            const operation = args[0];
            if (!operation) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '📊 *Matrix Operations*\n\n🔢 Available operations:\n• .matrix add [[1,2],[3,4]] [[5,6],[7,8]]\n• .matrix multiply [[1,2],[3,4]] [[5,6],[7,8]]\n• .matrix det [[1,2],[3,4]]\n• .matrix inv [[1,2],[3,4]]\n• .matrix transpose [[1,2],[3,4]]'
                });
            }

            const matrixStr = args.slice(1).join(' ');
            
            switch (operation.toLowerCase()) {
                case 'add':
                    const [matrix1, matrix2] = matrixStr.split('] [');
                    const m1 = math.evaluate(matrix1 + ']');
                    const m2 = math.evaluate('[' + matrix2);
                    const sum = math.add(m1, m2);
                    
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `➕ *Matrix Addition*\n\nResult:\n${math.format(sum)}\n\n✅ Calculated by CIARA-IV`
                    });
                    break;

                case 'multiply':
                    const [mat1, mat2] = matrixStr.split('] [');
                    const ma1 = math.evaluate(mat1 + ']');
                    const ma2 = math.evaluate('[' + mat2);
                    const product = math.multiply(ma1, ma2);
                    
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `✖️ *Matrix Multiplication*\n\nResult:\n${math.format(product)}\n\n✅ Calculated by CIARA-IV`
                    });
                    break;

                case 'det':
                case 'determinant':
                    const matrix = math.evaluate(matrixStr);
                    const determinant = math.det(matrix);
                    
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `🔢 *Matrix Determinant*\n\nMatrix: ${matrixStr}\nDeterminant: ${determinant}\n\n✅ Calculated by CIARA-IV`
                    });
                    break;

                case 'inv':
                case 'inverse':
                    const invMatrix = math.evaluate(matrixStr);
                    const inverse = math.inv(invMatrix);
                    
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `🔄 *Matrix Inverse*\n\nResult:\n${math.format(inverse)}\n\n✅ Calculated by CIARA-IV`
                    });
                    break;

                case 'transpose':
                    const transposeMatrix = math.evaluate(matrixStr);
                    const transposed = math.transpose(transposeMatrix);
                    
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `🔃 *Matrix Transpose*\n\nResult:\n${math.format(transposed)}\n\n✅ Calculated by CIARA-IV`
                    });
                    break;

                default:
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: '❌ Invalid matrix operation. Use: add, multiply, det, inv, or transpose'
                    });
            }

        } catch (error) {
            console.error('Matrix error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Error performing matrix operation. Please check your matrix format.'
            });
        }
    },

    // Statistics calculator
    stats: async (sock, msg, args) => {
        try {
            const numbersStr = args.join(' ');
            if (!numbersStr) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Please provide numbers for statistical analysis\nExample: .stats 1,2,3,4,5 or .stats 1 2 3 4 5'
                });
            }

            // Parse numbers from input
            const numbers = numbersStr.replace(/,/g, ' ').split(/\s+/).map(n => parseFloat(n)).filter(n => !isNaN(n));
            
            if (numbers.length === 0) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ No valid numbers found in input'
                });
            }

            // Calculate statistics
            const mean = math.mean(numbers);
            const median = math.median(numbers);
            const mode = math.mode(numbers);
            const std = math.std(numbers);
            const variance = math.variance(numbers);
            const min = math.min(numbers);
            const max = math.max(numbers);
            const sum = math.sum(numbers);

            await sock.sendMessage(msg.key.remoteJid, {
                text: `📊 *Statistical Analysis*\n\n🔢 Dataset: [${numbers.join(', ')}]\n📊 Count: ${numbers.length}\n📈 Sum: ${sum}\n📉 Mean: ${mean.toFixed(4)}\n📍 Median: ${median}\n🎯 Mode: ${Array.isArray(mode) ? mode.join(', ') : mode}\n📏 Standard Deviation: ${std.toFixed(4)}\n📐 Variance: ${variance.toFixed(4)}\n⬇️ Minimum: ${min}\n⬆️ Maximum: ${max}\n📊 Range: ${max - min}\n\n✅ Analyzed by CIARA-IV`
            });

        } catch (error) {
            console.error('Stats error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Error calculating statistics. Please check your input format.'
            });
        }
    },

    // Unit converter
    convertunit: async (sock, msg, args) => {
        try {
            if (args.length < 3) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '📏 *Unit Converter*\n\n🔄 Usage: .convertunit [value] [from_unit] [to_unit]\n\n📝 Examples:\n• .convertunit 100 cm m\n• .convertunit 32 fahrenheit celsius\n• .convertunit 1 mile km\n• .convertunit 1000 gram kg'
                });
            }

            const value = parseFloat(args[0]);
            const fromUnit = args[1].toLowerCase();
            const toUnit = args[2].toLowerCase();

            if (isNaN(value)) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Please provide a valid number as the first parameter'
                });
            }

            // Unit conversion mappings
            const conversions = {
                // Length
                'm_cm': 100,
                'cm_mm': 10,
                'km_m': 1000,
                'mile_km': 1.60934,
                'yard_m': 0.9144,
                'feet_m': 0.3048,
                'inch_cm': 2.54,
                
                // Weight
                'kg_g': 1000,
                'g_mg': 1000,
                'pound_kg': 0.453592,
                'ounce_g': 28.3495,
                
                // Temperature
                'celsius_fahrenheit': (c) => (c * 9/5) + 32,
                'fahrenheit_celsius': (f) => (f - 32) * 5/9,
                'celsius_kelvin': (c) => c + 273.15,
                'kelvin_celsius': (k) => k - 273.15,
                
                // Volume
                'l_ml': 1000,
                'gallon_l': 3.78541,
                'quart_l': 0.946353,
                'pint_ml': 473.176,
                
                // Time
                'hour_minute': 60,
                'minute_second': 60,
                'day_hour': 24,
                'week_day': 7,
                'year_day': 365.25
            };

            let result;
            const conversionKey = `${fromUnit}_${toUnit}`;
            const reverseKey = `${toUnit}_${fromUnit}`;

            if (conversions[conversionKey]) {
                if (typeof conversions[conversionKey] === 'function') {
                    result = conversions[conversionKey](value);
                } else {
                    result = value * conversions[conversionKey];
                }
            } else if (conversions[reverseKey]) {
                if (typeof conversions[reverseKey] === 'function') {
                    result = conversions[reverseKey](value);
                } else {
                    result = value / conversions[reverseKey];
                }
            } else {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Conversion not supported between these units'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: `🔄 *Unit Conversion*\n\n📊 ${value} ${fromUnit} = ${result.toFixed(6)} ${toUnit}\n\n✅ Converted by CIARA-IV`
            });

        } catch (error) {
            console.error('ConvertUnit error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Error converting units. Please check your input format.'
            });
        }
    },

    // Probability calculator
    probability: async (sock, msg, args) => {
        try {
            const operation = args[0];
            if (!operation) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '🎲 *Probability Calculator*\n\n🔢 Available operations:\n• .probability combination 10 3\n• .probability permutation 10 3\n• .probability factorial 5\n• .probability binomial 10 0.3 4\n• .probability normal 0 1 1.96'
                });
            }

            switch (operation.toLowerCase()) {
                case 'combination':
                case 'c':
                    const n1 = parseInt(args[1]);
                    const r1 = parseInt(args[2]);
                    if (isNaN(n1) || isNaN(r1)) {
                        return sock.sendMessage(msg.key.remoteJid, {
                            text: '❌ Please provide valid integers for n and r'
                        });
                    }
                    const combination = math.combinations(n1, r1);
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `🔢 *Combination*\n\nC(${n1}, ${r1}) = ${combination}\n\n✅ Calculated by CIARA-IV`
                    });
                    break;

                case 'permutation':
                case 'p':
                    const n2 = parseInt(args[1]);
                    const r2 = parseInt(args[2]);
                    if (isNaN(n2) || isNaN(r2)) {
                        return sock.sendMessage(msg.key.remoteJid, {
                            text: '❌ Please provide valid integers for n and r'
                        });
                    }
                    const permutation = math.permutations(n2, r2);
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `🔢 *Permutation*\n\nP(${n2}, ${r2}) = ${permutation}\n\n✅ Calculated by CIARA-IV`
                    });
                    break;

                case 'factorial':
                case 'f':
                    const num = parseInt(args[1]);
                    if (isNaN(num) || num < 0) {
                        return sock.sendMessage(msg.key.remoteJid, {
                            text: '❌ Please provide a valid non-negative integer'
                        });
                    }
                    const factorial = math.factorial(num);
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `🔢 *Factorial*\n\n${num}! = ${factorial}\n\n✅ Calculated by CIARA-IV`
                    });
                    break;

                case 'binomial':
                    const trials = parseInt(args[1]);
                    const prob = parseFloat(args[2]);
                    const successes = parseInt(args[3]);
                    
                    if (isNaN(trials) || isNaN(prob) || isNaN(successes)) {
                        return sock.sendMessage(msg.key.remoteJid, {
                            text: '❌ Usage: .probability binomial [trials] [probability] [successes]'
                        });
                    }

                    const binomialProb = math.combinations(trials, successes) * 
                                       Math.pow(prob, successes) * 
                                       Math.pow(1 - prob, trials - successes);

                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `🎲 *Binomial Probability*\n\nP(X = ${successes}) = ${binomialProb.toFixed(6)}\nTrials: ${trials}, p: ${prob}\n\n✅ Calculated by CIARA-IV`
                    });
                    break;

                default:
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: '❌ Invalid probability operation. Use: combination, permutation, factorial, or binomial'
                    });
            }

        } catch (error) {
            console.error('Probability error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Error calculating probability. Please check your input.'
            });
        }
    },

    // Advanced calculator with graphing info
    advanced: async (sock, msg, args) => {
        try {
            const expression = args.join(' ');
            if (!expression) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '🧮 *Advanced Calculator*\n\n📝 Examples:\n• .advanced sin(pi/4)\n• .advanced log(100, 10)\n• .advanced sqrt(16)\n• .advanced abs(-5)\n• .advanced round(3.7)\n• .advanced random()'
                });
            }

            // Evaluate complex mathematical expressions
            const result = math.evaluate(expression);
            
            // Check if result is a function (for plotting info)
            let additionalInfo = '';
            if (expression.includes('x') && !expression.includes('=')) {
                additionalInfo = '\n\n📊 *Function detected!* You can plot this using graphing tools.';
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: `🧮 *Advanced Calculator*\n\n📝 Expression: ${expression}\n📊 Result: ${typeof result === 'object' ? math.format(result) : result}${additionalInfo}\n\n✅ Calculated by CIARA-IV`
            });

        } catch (error) {
            console.error('Advanced calc error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Invalid expression. Please check your mathematical syntax.'
            });
        }
    },

    // Equation solver
    solve: async (sock, msg, args) => {
        try {
            const equation = args.join(' ');
            if (!equation || !equation.includes('=')) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Please provide an equation to solve\nExample: .solve x^2 + 2*x - 3 = 0'
                });
            }

            // Basic quadratic equation solver
            if (equation.includes('x^2') || equation.includes('x²')) {
                const quadraticMatch = equation.match(/(-?\d*\.?\d*)\*?x\^?2\s*([+-]\s*\d*\.?\d*)\*?x?\s*([+-]\s*\d*\.?\d*)\s*=\s*0/);
                
                if (quadraticMatch) {
                    const a = parseFloat(quadraticMatch[1] || '1');
                    const b = parseFloat(quadraticMatch[2] || '0');
                    const c = parseFloat(quadraticMatch[3] || '0');
                    
                    const discriminant = b * b - 4 * a * c;
                    
                    let solutions = '';
                    if (discriminant > 0) {
                        const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
                        const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);
                        solutions = `x₁ = ${x1.toFixed(4)}\nx₂ = ${x2.toFixed(4)}`;
                    } else if (discriminant === 0) {
                        const x = -b / (2 * a);
                        solutions = `x = ${x.toFixed(4)} (double root)`;
                    } else {
                        const real = -b / (2 * a);
                        const imag = Math.sqrt(-discriminant) / (2 * a);
                        solutions = `x₁ = ${real.toFixed(4)} + ${imag.toFixed(4)}i\nx₂ = ${real.toFixed(4)} - ${imag.toFixed(4)}i`;
                    }
                    
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `🔍 *Quadratic Equation Solver*\n\nEquation: ${equation}\n\nSolutions:\n${solutions}\n\nDiscriminant: ${discriminant.toFixed(4)}\n\n✅ Solved by CIARA-IV`
                    });
                    return;
                }
            }

            // For other equations, provide general guidance
            await sock.sendMessage(msg.key.remoteJid, {
                text: `🔍 *Equation Solver*\n\nEquation: ${equation}\n\n📝 For complex equations, try:\n• Rearranging to isolate variables\n• Using substitution methods\n• Applying mathematical identities\n\n*Currently supports quadratic equations automatically*\n\n✅ Processed by CIARA-IV`
            });

        } catch (error) {
            console.error('Solve error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Error solving equation. Please check your equation format.'
            });
        }
    }
};

export default mathCommands;