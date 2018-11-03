# vscode-jscad-editor

This extension provides a JSCAD preview panel for *.jscad files in Visual Studio Code, (theoretically) allowing to create 3D-printable objects using Javascript.

> WARNING: this is a prototype that was created on one afternoon! It really just provides the basic preview functionality for JSCAD objects.

## Features

This prototype is the result of a bored afternoon, after I got my new 3D printer but still had to wait for the PLA to be delivered. First I discovered [OpenSCAD](http://openscad.org) and then stumbled upon [OpenJSCAD.org](http://openjscad.org), which I think are both totally exciting for any programmer with a design background and a 3D printer :) ..

Being a bit underwhelmed by existing editing solutions available for both, I decided to connect VSCode and JSCAD, while at the same time getting my hands dirty with extension development for VSCode. This is what came out. Yay!

This screencast shows the editor on the left and the interactive JSCAD preview on the right. Changing anything in the code causes immediate updates in the preview.

![JSCAD Preview Screenshot](./jscad-screencast-2.gif)

## Usage

For the time being (while this is not published to the marketplace) - clone this repository, cd into it, install dependencies, compile and open VSCode:

    cd vscode-jscad-editor
    npm install
    npm run compile
    code .

In VSCode press `F5` to start an editor session with the extension loaded. Then open a `*.jscad` file, e.g. from the included `examples` directory and see what happens (a few examples don't work)

## Known Issues

- JSCAD viewer is still the default "viewer-options.html" from jscad web build; should create a custom build and use the Processor directly instead, using a real application build
- view presets (top/left/front/...) are a bit stupid and often too close or too far away; should calculate the optimal view distance instead
- high chance of memory leaks because some things are not properly cleaned or disposed yet

## Release Notes

### 0.0.2

Now with improved viewer panel, JSCAD > STL export command, statusbar output and basic error messages.

### 0.0.1

Initial prototype
