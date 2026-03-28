# Web APP - Implementation Status

## Rationale [Implemented]

Plain vanilla JS + CSS + HTML, Single page, Web App hosted by `./bin/transceiver.js` "Server" application.
UI controls is a grid of buttons, sliders and numeric values in bold dark CSS theme replacing current midi and keys events.
Web APP connects to Web server over WebSocket ( `ws` package ), sends key press, slide events; and receiving state updates to display.

## APP layout [Implemented]

When in landscape mode contains 3 bold rows 1/3 each:

1) **Row 1: Control & Channel Selection**
   - **Channel select buttons**: Dynamic list, number depends on loaded config file. [Done]
   - **transceiverMode ON/OFF button**: Toggle button (Green/Red), located on the right of the channel buttons. [Done]

2) **Row 2: RIT Control**
   - **RIT slider**: Range ±3000 Hz, step 50Hz. Replacing current MIDI controller. [Done]
   - **Visuals**: Touch / Mouse friendly. Current RIT value is shown over the slider. [Done]

3) **Row 3: Time Offset Control**
   - **Time offset slider**: Range ±3000 ms, step 50ms. Using `tweaktime` function, replacing related key bindings. [Done]
   - **Visuals**: Current `msOffset` is shown over the slider. [Done]

## Technical details

- **Server**: `bin/transceiver.js` (Express + WebSocket).
- **Frontend**: `public/index.html` (Vanilla JS).
- **Protocol**: JSON over WebSocket.
- **Port**: Dynamically assigned using `portfinder`.
