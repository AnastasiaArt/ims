let canvas = document.getElementById("metaballsId");
        let gl = canvas.getContext('webgl');

        let NUM_METABALLS = 7;
        let WIDTH = canvas.width;
        let HEIGHT = canvas.height;

        /**
         * Shaders
         */

// Utility to fail loudly on shader compilation failure
        function compileShader(shaderSource, shaderType) {
            let shader = gl.createShader(shaderType);
            gl.shaderSource(shader, shaderSource);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
            }

            return shader;
        }

        let vertexShader = compileShader('\n\
attribute vec2 position;\n\
\n\
void main() {\n\
    // position specifies only x and y.\n\
    // We set z to be 0.0, and w to be 1.0\n\
    gl_Position = vec4(position, 0.0, 1.0);\n\
}\
', gl.VERTEX_SHADER);
        let backgroundVec4 = [0.9568627450980393, 0.9607843137254902, 0.2, 0].join(', ');
        let color = [0.37254901960784315, 0.396078431372549, 0.8549019607843137, 1].join((', '));
        let fragmentShader = compileShader('\n\
precision highp float;\n\
uniform vec3 metaballs[' + NUM_METABALLS + '];\n\
const float WIDTH = ' + WIDTH + '.0;\n\
const float HEIGHT = ' + HEIGHT + '.0;\n\
\n\
void main(){\n\
    float x = gl_FragCoord.x;\n\
    float y = gl_FragCoord.y;\n\
    float v = 0.0;\n\
    for (int i = 0; i < ' + NUM_METABALLS + '; i++) {\n\
        vec3 mb = metaballs[i];\n\
        float dx = mb.x - x;\n\
        float dy = mb.y - y;\n\
        float r = mb.z;\n\
        v += r*r/(dx*dx + dy*dy);\n\
    }\n\
    if (v > 1.0) {\n\
        gl_FragColor = vec4(0.592156862745098, 0.592156862745098, 0.9098039215686274, 1);\n\
    } else {\n\
        gl_FragColor = vec4('+ backgroundVec4 +');\n\
    }\n\
}\n\
', gl.FRAGMENT_SHADER);

        let program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);

        /**
         * Geometry setup
         */

// Set up 4 vertices, which we'll draw as a rectangle
// via 2 triangles
//
//   A---C
//   |  /|
//   | / |
//   |/  |
//   B---D
//
// We order them like so, so that when we draw with
// gl.TRIANGLE_STRIP, we draw triangle ABC and BCD.
        let vertexData = new Float32Array([
            -1.0,  1.0, // top left
            -1.0, -1.0, // bottom left
            1.0,  1.0, // top right
            1.0, -1.0, // bottom right
        ]);
        let vertexDataBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

        /**
         * Attribute setup
         */

// Utility to complain loudly if we fail to find the attribute

        function getAttribLocation(program, name) {
            let attributeLocation = gl.getAttribLocation(program, name);
            if (attributeLocation === -1) {
                throw 'Can not find attribute ' + name + '.';
            }
            return attributeLocation;
        }

        // To make the geometry information available in the shader as attributes, we
        // need to tell WebGL what the layout of our data in the vertex buffer is.
        let positionHandle = getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(positionHandle);
        gl.vertexAttribPointer(positionHandle,
            2, // position is a vec2
            gl.FLOAT, // each component is a float
            gl.FALSE, // don't normalize values
            2 * 4, // two 4 byte float components per vertex
            0 // offset into each span of vertex data
        );

        /**
         * Simulation setup
         */

        let metaballs = [];

        for (let i = 0; i < NUM_METABALLS; i++) {
            let radius = Math.random() * 40 + 10;
            metaballs.push({
                x: Math.random() * (WIDTH - 2 * radius) + radius,
                y: Math.random() * (HEIGHT - 2 * radius) + radius,
                vx: Math.random() * 10 - 5,
                vy: Math.random() * 10 - 5,
                r: radius
            });
        }

        /**
         * Uniform setup
         */

// Utility to complain loudly if we fail to find the uniform
        function getUniformLocation(program, name) {
            let uniformLocation = gl.getUniformLocation(program, name);
            if (uniformLocation === -1) {
                throw 'Can not find uniform ' + name + '.';
            }
            return uniformLocation;
        }
        let metaballsHandle = getUniformLocation(program, 'metaballs');

        /**
         * Simulation step, data transfer, and drawing
         */

        let step = function() {
            // Update positions and speeds
            for (let i = 0; i < NUM_METABALLS; i++) {
                let mb = metaballs[i];

                mb.x += mb.vx/10;
                if (mb.x - mb.r < 20) {
                    mb.x = mb.r + 21;
                    mb.vx = Math.abs(mb.vx);
                } else if (mb.x + mb.r > WIDTH -20) {
                    mb.x = WIDTH - mb.r - 20;
                    mb.vx = -Math.abs(mb.vx);
                }
                mb.y += mb.vy/10;
                if (mb.y - mb.r < 20) {
                    mb.y = mb.r + 21;
                    mb.vy = Math.abs(mb.vy);
                } else if (mb.y + mb.r > HEIGHT -20) {
                    mb.y = HEIGHT - mb.r -20;
                    mb.vy = -Math.abs(mb.vy);
                }
            }

            // To send the data to the GPU, we first need to
            // flatten our data into a single array.
            let dataToSendToGPU = new Float32Array(3 * NUM_METABALLS);
            for (let i = 0; i < NUM_METABALLS; i++) {
                let baseIndex = 3 * i;
                let mb = metaballs[i];
                dataToSendToGPU[baseIndex + 0] = mb.x;
                dataToSendToGPU[baseIndex + 1] = mb.y;
                dataToSendToGPU[baseIndex + 2] = mb.r;
            }
            gl.uniform3fv(metaballsHandle, dataToSendToGPU);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            requestAnimationFrame(step);
        };

        module.exports =step;
