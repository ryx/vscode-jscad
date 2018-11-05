# Unsorted TODOs

TODO:
- store viewport settings for each document and restore them on activation based on editor.fileName (and unserialize after revive)
- fix icon hover effects and load the SVGs directly instead of hardcoding the SVG data into JSCADPreviewPanel
- send global error messages to VSCode console instead of displaying them inside the "red box"

IDEAS:
- visually highlight currently edited shape (maybe by injecting a setColor statement into the code passed to setJsCad? would require parsing the JSCAD code, though)