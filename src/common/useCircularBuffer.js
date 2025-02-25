// useCircularBuffer.js
const React = require('react');

const useCircularBuffer = (size = 10) => {
    // Internal circular buffer state stored in a ref.
    const bufferRef = React.useRef({
        buffer: new Array(size),
        index: 0,
        count: 0,
        sum: 0,
    });

    // Average state that can trigger re-renders.
    const [average, setAverage] = React.useState(0);

    // Push a new value into the circular buffer.
    const push = React.useCallback((value) => {
        const buf = bufferRef.current;
        // If the buffer is full, subtract the value being overwritten.
        if (buf.count === size) {
            buf.sum -= buf.buffer[buf.index];
        } else {
            buf.count++;
        }
        // Store the new value and update the running sum.
        buf.buffer[buf.index] = value;
        buf.sum += value;
        // Move index, wrapping around if necessary.
        buf.index = (buf.index + 1) % size;
        // Update the average state.
        const newAverage = Math.round(buf.sum / buf.count);
        setAverage(newAverage);
        return newAverage;
    }, [size]);

    return [average, push];
};

module.exports = useCircularBuffer;
