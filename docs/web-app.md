# Web APP

## Rationale

Plain vanila JS + CSS + HTML, Single page, Web App hosted by `./bin/transceiver.js` "Server" application.
UI controls is a grid of buttons, sliders and numeric values in bold dark CSS theme replacing current midi and keys events.
Web APP connects to Web server over WebSocket ( `ws` package ), sends key press, slide events; and receiving state updates to display.

## APP layout

When in landscape mode contains 3 bold rows 1/3 each:

1) row of channel select buttons. number depends on config file.
2) RIT slider -3.2...+3.1 KHz replacing current MIDI controller. Touch / Mouse friendly. Show current RIT value over the slider. transceiverMode ON/OFF button replacing the key event.
3) Time offset using tweaktime function, replacing related key bindings. msOffset over the slider.
