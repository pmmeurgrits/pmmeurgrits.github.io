// player.js
"use strict";

const scaleCanvas = (cvs) => {
    cvs.height = window.innerHeight - 50 - 20;
    cvs.width = cvs.height * (16 / 9); // Adjust width to aspect ratio.
    Model.setScale(cvs.width / 12);
}

// Updates and draws the model to the canvas.
const CanvasModelUpdate = (ctx, env, theme, width, height) => {
    // Catch the element nearest to the pointer.
    Model.setHighlight(
        Model.nearestMass(mouse.getPos(Model.getScale()), 0.15) 
        || Model.nearestSpring(mouse.getPos(Model.getScale()), 0.15));
    // Draw model.
    ctx.clearRect(0, 0, width, height);
    MouseConstructor.draw(ctx, mouse.getPos(), Model.getHighlight(), theme);
    Model.draw(ctx, theme);
    // Update model for next frame.
    for (let i = 0; i < Model.getStepsPerFrame(); i++) Model.update();
}

// Theme to use for colors.
const theme_dark = {
    // Window space colors.
    menuBar: "#1F1F1F",
    barTxt: "#FFFFFF",
    btnTxt: "#FFFFFF",
    btnDefault: "#1DB322",
    btnHighlight: "#47DE4C",
    btnSelected: "#D7BC27",
    btnSelected_h: "#F0DA60",
    btnClicked: "#168119",
    canvasNegative: "#000000",
    // Canvas space colors.
    background: "#2C2C2C",
    mass: "#1DB322",
    fixed_center: "#2C2C2C",    
    spring: "#FFFFFF",
    m_selected: "#D7BC27",
    s_selected: "#D7BC27",
    m_highlighted: "#47DE4C",
    s_highlighted: "#B3D6B1",
    s_construct: "#ACACAC",
    m_delete: "#FF0000",
    s_delete: "#FF0000",
    bound: "#FFFFFF"
};
const theme_nostalgic = {
    // Window space colors.
    menuBar: "#D3D3D3",
    barTxt: "#000000",
    btnTxt: "#FFFFFF",
    btnDefault: "#1B8CD2",
    btnHighlight: "#65AEDC",
    btnSelected: "#FF584B",
    btnSelected_h: "#FE776D",
    btnClicked: "#1872A9",
    canvasNegative: "#F0F0F0",
    // Canvas space colors.
    background: "#FFFFFF",
    mass: "#000000",
    fixed_center: "#2C2C2C",    
    spring: "#000000",
    m_selected: "#1B8CD2",
    s_selected: "#1B8CD2",
    m_highlighted: "#000000",
    s_highlighted: "#000000",
    s_construct: "#ACACAC",
    m_delete: "#FF0000",
    s_delete: "#FF0000",
    bound: "#FFFFFF"
};

// Sets theme to CSS variables.
let currentTheme = theme_dark;
const setRootTheme = theme => {
    const root = document.documentElement;
    root.style.setProperty('--btnTxt', theme.btnTxt);
    root.style.setProperty('--barTxt', theme.barTxt);
    root.style.setProperty('--defaultColor', theme.btnDefault);
    root.style.setProperty('--highlightColor', theme.btnHighlight);
    root.style.setProperty('--selectedColor', theme.btnSelected);
    root.style.setProperty('--selectedColor-highlight', theme.btnSelected_h);
    root.style.setProperty('--clickedColor', theme.btnClicked);
    root.style.setProperty('--menuBarColor', theme.menuBar);
    root.style.setProperty('--canvasBackground', theme.background);
    root.style.setProperty('--emptySpaceColor', theme.canvasNegative);
    currentTheme = theme;
}

// Model player initialization
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
scaleCanvas(canvas);
// Attach mouse event handlers to the canvas.
const mouse = MouseHandler(canvas, Model.getScale());
mouse.attachEvents(canvas);

// Model.export().replaceAll("\n", "").replaceAll(" ", "")
//Model.import('{"init":{"environment":{"g":{"x":0,"y":20.67},"d":0,"bounds":[],"s_bounds":{"x":0,"y":0,"w":12,"h":6.754553339115351}},"waveform":{"amp":0.5,"wSpd":0.5,"t":-66.27166666662264},"scale":96.08333333333333,"frameTime":0.016666666666666666,"stepsPerFrame":5,"delta":0.003333333333333333,"collisions_enabled":true},"masses":[{"mass":0.08,"radius":0.08,"pos":{"x":4.293684094871762,"y":1.9974571209263339},"prv":{"x":4.293678375871013,"y":1.9974486058133494},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.16,"radius":0.08,"pos":{"x":6.153367867655137,"y":0.8809567798054946},"prv":{"x":6.153367867655137,"y":0.8809567798054946},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":true,"ignore":false},{"mass":0.16,"radius":0.08,"pos":{"x":6.050878372123074,"y":2.2115933471006652},"prv":{"x":6.050878372123074,"y":2.2115933471006652},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":true,"ignore":false},{"mass":0.08,"radius":0.08,"pos":{"x":4.932178249744585,"y":3.0867266591903237},"prv":{"x":4.932160610296202,"y":3.086712596302664},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.08,"radius":0.08,"pos":{"x":3.682041254306612,"y":2.658418933263773},"prv":{"x":3.6820297997826046,"y":2.658418867385976},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.08,"radius":0.08,"pos":{"x":4.57086527382316,"y":3.5390062104793962},"prv":{"x":4.5708627405542535,"y":3.5389983647733327},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.08,"radius":0.08,"pos":{"x":3.123087620344174,"y":3.819389113125886},"prv":{"x":3.123096248479025,"y":3.8194155419960087},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.08,"radius":0.08,"pos":{"x":4.206992003497999,"y":4.374406996048443},"prv":{"x":4.207012504344003,"y":4.3744039820768705},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.16,"radius":0.08,"pos":{"x":3.3315066579100385,"y":4.9226329746727435},"prv":{"x":3.3315432083951064,"y":4.922655955627792},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.16,"radius":0.08,"pos":{"x":3.088242615485583,"y":4.784962064367582},"prv":{"x":3.0882753107904843,"y":4.784991830647351},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.16,"radius":0.08,"pos":{"x":6.54640069384215,"y":2.237640936686904},"prv":{"x":6.54640069384215,"y":2.237640936686904},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":true,"ignore":false},{"mass":0.16,"radius":0.08,"pos":{"x":6.54640069384215,"y":0.8846487424111015},"prv":{"x":6.54640069384215,"y":0.8846487424111015},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":true,"ignore":false},{"mass":1,"radius":0.36,"pos":{"x":6.801874114784266,"y":4.260917527439538},"prv":{"x":6.801750587727103,"y":4.260949017307301},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.16,"radius":0.32,"pos":{"x":6.589656004762138,"y":6.006797217623937},"prv":{"x":6.587454169705767,"y":6.006538220565847},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.16,"radius":0.31,"pos":{"x":7.211496742333665,"y":5.965300572531007},"prv":{"x":7.209346741275121,"y":5.965841885150525},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.16,"radius":0.08,"pos":{"x":5.951792935454427,"y":3.340948481378064},"prv":{"x":5.9517680737737795,"y":3.340913626436445},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.14,"radius":0.08,"pos":{"x":8.366370690081068,"y":4.27342871070283},"prv":{"x":8.366370690081068,"y":4.27342871070283},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":true,"ignore":false}],"springs":[{"mA":0,"mB":1,"rst":1.9053074754675488,"stf":100,"dmp":5,"c_group":0},{"mA":1,"mB":2,"rst":1.3325427728362467,"stf":50,"dmp":5,"c_group":0},{"mA":2,"mB":3,"rst":1.9358475783446785,"stf":13.87,"dmp":5,"c_group":0},{"mA":3,"mB":0,"rst":1.290546400693842,"stf":50,"dmp":5,"c_group":0},{"mA":0,"mB":2,"rst":2.320808650925699,"stf":25.65,"dmp":5,"c_group":0},{"mA":1,"mB":3,"rst":2.330247113116498,"stf":25.65,"dmp":5,"c_group":0},{"mA":0,"mB":4,"rst":0.6400321692309907,"stf":50,"dmp":5,"c_group":0},{"mA":4,"mB":5,"rst":1.2862166127765053,"stf":50,"dmp":5,"c_group":0},{"mA":5,"mB":3,"rst":0.6660847174695195,"stf":50,"dmp":5,"c_group":0},{"mA":3,"mB":4,"rst":1.4296385289312927,"stf":50,"dmp":5,"c_group":0},{"mA":0,"mB":5,"rst":1.4589741681648434,"stf":50,"dmp":5,"c_group":0},{"mA":4,"mB":6,"rst":0.9387661225003029,"stf":23.51,"dmp":5,"c_group":0},{"mA":6,"mB":7,"rst":1.306935080412456,"stf":21.37,"dmp":5,"c_group":0},{"mA":7,"mB":5,"rst":0.9376115701971378,"stf":24.58,"dmp":5,"c_group":0},{"mA":5,"mB":6,"rst":1.5689311464022206,"stf":23.51,"dmp":5,"c_group":0},{"mA":4,"mB":7,"rst":1.6312116819494786,"stf":22.44,"dmp":5,"c_group":0},{"mA":7,"mB":8,"rst":1.0095403295750218,"stf":50,"dmp":5,"c_group":0},{"mA":8,"mB":9,"rst":0.26757939563953037,"stf":50,"dmp":5,"c_group":0},{"mA":9,"mB":6,"rst":0.8897764761071917,"stf":50,"dmp":5,"c_group":0},{"mA":6,"mB":8,"rst":1.0743580559012473,"stf":50,"dmp":5,"c_group":0},{"mA":9,"mB":7,"rst":1.2052199936899848,"stf":50,"dmp":5,"c_group":0},{"mA":2,"mB":10,"rst":0.3300297140298673,"stf":50,"dmp":5,"c_group":0},{"mA":10,"mB":11,"rst":1.3328272480345913,"stf":50,"dmp":5,"c_group":0},{"mA":11,"mB":1,"rst":0.3211159488171198,"stf":50,"dmp":5,"c_group":0},{"mA":1,"mB":10,"rst":1.3849842508953467,"stf":50,"dmp":5,"c_group":0},{"mA":11,"mB":2,"rst":1.3576969450615823,"stf":50,"dmp":5,"c_group":0},{"mA":10,"mB":12,"rst":1.5896785278159262,"stf":24.58,"dmp":5,"c_group":0},{"mA":12,"mB":2,"rst":1.6001120387266168,"stf":22.44,"dmp":5,"c_group":0},{"mA":12,"mB":13,"rst":1.6079370821120105,"stf":22.44,"dmp":5,"c_group":0},{"mA":13,"mB":14,"rst":0.6352067102723521,"stf":50,"dmp":5,"c_group":0},{"mA":14,"mB":12,"rst":1.601558430113139,"stf":22.44,"dmp":5,"c_group":0},{"mA":3,"mB":15,"rst":1.1288972427188906,"stf":69.58,"dmp":5,"c_group":0},{"mA":15,"mB":12,"rst":1.3497917538062516,"stf":72.8,"dmp":5,"c_group":0},{"mA":15,"mB":2,"rst":1.1221266501549463,"stf":27.8,"dmp":5,"c_group":0},{"mA":15,"mB":10,"rst":1.295572564337521,"stf":25.65,"dmp":5,"c_group":0},{"mA":12,"mB":1,"rst":3.265848941496562,"stf":25.65,"dmp":5,"c_group":0},{"mA":12,"mB":11,"rst":3.183588066184844,"stf":24.58,"dmp":5,"c_group":0},{"mA":12,"mB":16,"rst":1.528192085159763,"stf":58.87,"dmp":5,"c_group":0}],"actuators":[]}');
//Model.environment().g.y = 20.67;
Model.load();


// Resize canvas and scale when window changes size.
window.onresize = () => scaleCanvas(canvas);

setRootTheme(theme_dark);
const frame = () => {
    CanvasModelUpdate(context, env, currentTheme, canvas.width, canvas.height);
    requestAnimationFrame(frame);
}