// model_driver.js
'use strict';

// Draws the vector on the screen.
v2d.prototype.draw = function(ctx, origin, scale) {
    const p = this.mul(scale);
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(origin.x + p.x, origin.y + p.y);
    ctx.closePath();
    ctx.stroke();
}

v2d.prototype.toStr = function(fix) {
    return '<' + this.x.toFixed(fix) + ', ' + this.y.toFixed(fix) + '>';
}

// Masses: Has weight and reacts to forces and velocity. Moved via verlet integrator.
class Mass {
    constructor(pos, radius = 0.08, mass = 0.16) {
        this.mass = mass;
        this.radius = radius;
        this.pos = new v2d(pos.x, pos.y); // Current position.
        this.prv = new v2d(pos.x, pos.y); // Previous position.

        // These are default values expected to be rarely changed.
        this.refl = 0.75; // Surface reflection.
        this.mu_s = 0.8; // Static friction coefficient.
        this.mu_k = 0.6; // Dynamic friction coefficient.

        // Collision group.
        // Every mass and spring is found inside a collision group.
        // When in group -1 the mass or spring will collide with any other
        // element regardless of group.
        // When in group 0, the mass or spring will not collide with any
        // other element other than in group -1.
        // When in any group above 0, the mass or spring will only collide
        // against any element in the same group as well as group -1.
        this.c_group = 0;

        // Forces that can't be accumulated instantaneously (springs & surface friction).
        this.F_sum = new v2d();
        this.fric_prv = new v2d();

        // Allows the mass to ignore dynamics from integrator loop.
        this.isFixed = false;
        this.ignore = false;
    }
    // Get segment of previous to current position.
    d_p() {
        return this.pos.sub(this.prv);
    }
    // Set previous position according to a given segment.
    set_d_p(d_p = new v2d()) {
        this.prv.mEqu(this.pos.sub(d_p));
    }
    // Translates the mass by a difference in movement.
    translate(D, preserve_vel = true) {
        this.prv.mEqu(this.pos);
        this.pos.mAdd(D);
        if (!preserve_vel) this.prv.mEqu(this.pos);
    }
    // Get mass velocity [m/s]
    get_v(delta) {
        return this.pos.sub(this.prv).div(delta);
    }
    // Set mass to a given velocity [m/s]
    set_v(v, delta) {
        this.prv.mEqu(this.pos.sub(v.mul(delta)));
    }
    // Verlet integrator acceleration.
    v_accel(delta) {
        if (!this.ignore && !this.isFixed) {
            this.pos.mAdd(this.F_sum.div(this.mass).mul(delta * delta));
        } else {
            this.prv.mEqu(this.pos);
        }
    }
    // Verlet integrator inertia.
    v_iner() {
            const p = this.pos.mul(2).sub(this.prv);
            this.prv.mEqu(this.pos);
            this.pos.mEqu(p);
    }
    // Calculate and accumulate surface friction.
    f_k(S) {
        // To to: make this work correctly.
        const F_S = this.F_sum.pjt(S);
        const V_S = this.d_p().pjt(S);
        const F_Sp = this.F_sum.pjt(S.prp());
        const V_Sp = this.d_p().pjt(S.prp());

        const fk = V_S.inv().nrm().mul(this.mu_k * F_Sp.mag());
        console.log(fk);
        this.F_sum.mAdd(fk);
    }
    m_collide(masses, preserve) {
        for (let i = 0; i < masses.length; ++i) {
            const c = masses[i];
            // Check groups.
            if (this !== c && ((this.c_group === c.c_group && this.c_group !== 0 && c.c_group !== 0) || this.c_group === -1 || c.c_group === -1)) {
                // Check overlap.
                if (this.pos.isInRad(c.pos, this.radius + c.radius)) {
                    const seg = this.pos.sub(c.pos);
                    const D = seg.nrm().mul(this.radius + c.radius).sub(seg);

                    const v_memA = {va: this.d_p(), vb: c.d_p()}
                    const v_memB = {va: c.d_p(), vb: this.d_p()}
                    
                    if (!this.isFixed && !c.isFixed) {
                        this.pos.mAdd(D.div(2));
                        c.pos.mSub(D.div(2));
                    } else if(this.isFixed && !c.isFixed) {
                        c.pos.mSub(D);
                    } else if(!this.isFixed && c.isFixed) {
                        this.pos.mAdd(D);
                    }

                    if (preserve) {
                        if (!this.isFixed) this.deflect(c, v_memA);
                        if (!c.isFixed) c.deflect(this, v_memB);
                    }
                }
            }
        }
    }
    // Reflect mass's velocity according to a tangent direction.
    reflect(tan) {
        this.set_d_p(this.d_p().pjt(tan).add(this.d_p().pjt(tan.prp()).inv().mul(this.refl)));
    }
    // Deflect mass from collision with other mass.
    deflect(mass2, mem) {
        const v1 = mem ? mem.va : this.d_p();
        const v2 = mem ? mem.vb : mass2.d_p();
        const r = (this.refl + mass2.refl) / 2;
        this.set_d_p(v1.sub(v1.sub(v2).pjt(this.pos.sub(mass2.pos))
        .mul(r * 2 * mass2.mass / (this.mass + mass2.mass))));
    }
    draw(ctx, scale, sum = 0) {
        const rad = (this.radius + sum) * scale;
        const p = this.pos.mul(scale);
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
    }
};

// Spring. Holds two existing masses and acts on them to simulate a spring.
class Spring {
    constructor(mA, mB, restlength, stiffness = 50, damping = 5) {
        this.mA = mA;
        this.mB = mB;
        this.rst = restlength;
        this.stf = stiffness;
        this.dmp = damping;
        this.c_group = 0; // Collision group. Equal values above 0 will collide.
    }
    translate(D, preserve_vel = true) {
        this.mA.translate(D, preserve_vel);
        this.mB.translate(D, preserve_vel);
    }
    // Returns the spring's geometric center.
    centroid() {
        return this.mA.pos.add(this.mB.pos).div(2);
    }
    // Returns the spring's center of mass.
    m_center() {
        return this.mA.pos.mul(this.mA.mass).add(this.mB.pos.mul(this.mB.mass)).div(2 * (this.mA.mass + this.mB.mass));
    }
    // Returns perpendicular segment to a given point. Returns undefined if point is not within range.
    p_seg(P, rad) {
        const AB = this.mB.pos.sub(this.mA.pos);
        const l = AB.mag2();
        const AP = P.sub(this.mA.pos);
        const BP = P.sub(this.mB.pos);
        const isInRange = AP.mag2() < l && BP.mag2() < l;
        const S = AP.pjt(AB).sub(AP)
        return isInRange && S.mag2() < rad * rad ? S : undefined;
    }
    // Returns resulting force respect to mA.
    Fs(delta) {
        const AB = this.mB.pos.sub(this.mA.pos);
        const l = AB.mag();
        // Springing force.
        return AB.div(l).mul((l - this.rst) * this.stf);
    }
    Fd_A(delta) {
        // Damping force.
        const AB = this.mB.pos.sub(this.mA.pos);
        const v_A = this.mA.d_p();
        const v_B = this.mB.d_p();
        return v_B.sub(v_A).div(delta).pjt(AB).mul(this.dmp);
    }
    Fd_B(delta) {
        // Damping force.
        const AB = this.mB.pos.sub(this.mA.pos);
        const v_A = this.mA.d_p();
        const v_B = this.mB.d_p();
        return v_A.sub(v_B).div(delta).pjt(AB).mul(this.dmp);
    }
    // Calculates forces and mutably sums to masses.
    apply_F(delta) {
        const Fs = this.Fs();
        this.mA.F_sum.mAdd(Fs.add(this.Fd_A(delta)));
        this.mB.F_sum.mAdd(Fs.inv().add(this.Fd_B(delta)));
    }
    seg_length() {
        const pA = this.mA.pos;
        const pB = this.mB.pos;
        return pA.len(pB);
    }
    draw(ctx, scale) {
        const pA = this.mA.pos.mul(scale);
        const pB = this.mB.pos.mul(scale);
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.closePath();
        ctx.stroke();
    }
}

// Actuators. The following classes modify element properties according to a waveform.
// Classic restlength-modifying muscle.
class MuscleSpringActuator
{
    constructor(spring, phase = 0, sense = 0.5) {
        this.type = "SpringMuscle";
        this.acted = spring;
        this.phase = phase;
        this.sense = sense;

        this.default = spring.rst;
    }
    act(amp, wSpd, t)
    {
        const factor = 1 + amp * this.sense * Math.sin(wSpd * t + (this.phase / Math.abs(wSpd)));
        this.acted.rst = this.default * (factor);
    }
    restore()
    {
        this.acted.rst = this.default;
    }
};

// Relaxation stiffness-modifying muscle.
class RelaxationSpringActuator
{
    constructor(spring, phase = 0, sense = 0.5) {
        this.type = "SpringRelax";
        this.acted = spring;
        this.phase = phase;
        this.sense = sense;

        this.default = spring.stf;
    }
    act(amp, wSpd, t) {
        // Muscle stiffness travels from default value to a lower value.
        const factor = (1 + Math.sin(wSpd * t + this.phase / Math.abs(wSpd))) / 2;
        this.acted.stf = this.default * amp * (1 - factor);
    }
    restore()
    {
        this.acted.stf = this.default;
    }
};
// Modifies mass radius by waveform.
class BalloonMassActuator {
    constructor(mass, phase = 0, sense = 0.5, multiplier = 1) {
        this.type = "MassBalloon";
        this.acted = mass;
        this.phase = phase;
        this.sense = sense;
        this.mult = multiplier; // Max times the mass's radius increases by.

        this.default = mass.radius;
    }
    act(amp, wSpd, t) {
        const factor = (1 + Math.sin(wSpd * t + this.phase / Math.abs(wSpd))) / 2;
        this.acted.radius = this.default * (1 + this.mult * amp * this.sense * factor);
    }
    restore() {
        this.acted.radius = this.default;
    }
};
// Modifies mass's mass by waveform.
class VaryMassActuator {
    constructor(mass, phase = 0, sense = 0.5, multiplier = 1) {
        this.type = "MassVary";
        this.acted = mass;
        this.phase = phase;
        this.sense = sense;
        this.mult = multiplier; // Max times the mass's radius increases by.

        this.default = mass.mass;
    }
    act(amp, wSpd, t) {
        const factor = (1 + Math.sin(wSpd * t + this.phase / Math.abs(wSpd))) / 2;
        this.acted.mass = this.default * (1 + this.mult * amp * this.sense * factor);
    }
    restore() {
        this.acted.mass = this.default;
    }
};

// Environment that acts on the model.
class Environment {
    constructor(gravity = new v2d(), drag = 0, x = undefined, y = undefined, w = undefined, h = undefined)
    {
        this.g = gravity;
        this.d = drag;
        this.bounds = [];
        this.s_bounds = { x: x, y: y, w: w, h: h };
    }
    addBound(A, B) {
        this.bounds.push({ A: new v2d(A.x, A.y), B: new v2d(B.x, B.y) });
    }
    boundCollide(m, preserve) {
        for (let i = 0; i < this.bounds.length; i++) {
            const b = this.bounds[i];
            const AB = b.B.sub(b.A);
            const AP = m.pos.sub(b.A);
            const BP = m.pos.sub(b.B);
            const pjt = AP.pjt(AB);
            if (pjt.isInRad(AP, m.radius) && AB.isGreater(AP) && AB.isGreater(BP)
            || b.A.isInRad(m.pos, m.radius) || b.B.isInRad(m.pos, m.radius)) {
                const S = pjt.sub(AP);
                const R = S.nrm().mul(m.radius);
                const T = R.sub(S);
                // Reposition mass.
                m.pos.mSub(T);
                m.prv.mSub(T);
                if (preserve) m.reflect(AB);
            }
        }
    }
    // Screen bounds.
    s_boundHit(m, preserve) {
        const d_horz = new v2d(1, 0); // Horizontal direction
        const d_vert = new v2d(0, 1); // Vertical direction
        let LR_Hit = undefined; // Returns if the mass hit left or right wall.
        // Mass hits bottom bound.
        if (this.s_bounds.h !== undefined && m.pos.y + m.radius > this.s_bounds.h) {
            const p_temp = m.pos.y;
            m.pos.y = this.s_bounds.h - m.radius;
            m.prv.y += m.pos.y - p_temp;
            if (preserve) m.reflect(d_horz);
        // Mass hits top bound.
        } else if (this.s_bounds.y !== undefined && m.pos.y - m.radius < this.s_bounds.y) {
            const p_temp = m.pos.y;
            m.pos.y = this.s_bounds.y + m.radius;
            m.prv.y += m.pos.y - p_temp;
            if (preserve) m.reflect(d_horz);
        }
        // Mass hits right bound.
        if (this.s_bounds.w !== undefined && m.pos.x + m.radius > this.s_bounds.w) {
            const p_temp = m.pos.x;
            LR_Hit = 'R';
            m.pos.x = this.s_bounds.w - m.radius;
            m.prv.x += m.pos.x - p_temp;
            if (preserve) m.reflect(d_vert);
        // Mass hits left bound.
        } else if (this.s_bounds.x !== undefined && m.pos.x - m.radius < this.s_bounds.x) {
            const p_temp = m.pos.x;
            LR_Hit = 'L';
            m.pos.x = this.s_bounds.x + m.radius;
            m.prv.x += m.pos.x - p_temp;
            if (preserve) m.reflect(d_vert);
        }
        return LR_Hit;
    }
    screenFriction(m) {
        if (this.s_bounds.h != undefined && m.pos.y + m.radius >= this.s_bounds.h) {
            const magX = Math.abs(m.d_p().x);
            const fk = magX > 0 ? Math.abs(m.F_sum.y) * m.mu_k * -(m.d_p().x / magX) : 0;
            const sTol = 1E-4;
            if (magX < sTol && Math.abs(m.F_sum.x) < m.F_sum.y * m.mu_s) {
                m.F_sum.x = 0;
                m.prv.x = m.pos.x;
            } 
            else m.F_sum.x += fk;
        }
    }
    draw(ctx, color, scale = 100) {
        ctx.strokeStyle = color;
        for (let b of this.bounds) {
            ctx.beginPath();
            ctx.moveTo(b.A.x * scale, b.A.y * scale);
            ctx.lineTo(b.B.x * scale, b.B.y * scale);
            ctx.closePath();
            ctx.stroke();
        }
    }
}

// Model driver singleton. Manages all movement, dynamics and user input.
const Model = (() => {
    const env = new Environment(new v2d(0, 0), 0);
    let masses = []; // Holds all masses to be used.
    let springs = []; // Holds all springs that link masses.
    
    let scale = 100; // Model scale in pixels per meter.
    let frameTime = 1 / 60;
    let stepsPerFrame = 1;
    let delta = frameTime / stepsPerFrame; // Elapsed time between frames.
    let collisions_enabled = false; // Free collisions disabled by default.
    
    // Actuator properties.
    let actuators = []; // Holds all active actuators.
    let amp = 0.5; // Wave amplitude.
    let wSpd = 0.5; // Wave speed.
    let dir = 1; // Wave direction.
    let t = 0; // Wave time.

    // Elements under user influence.
    let highlight = undefined;
    let select = undefined;
    let drag = undefined;
    let pause = false;

    // Mass-spring collisions.
    const ms_collide = m => {
        for (let i = 0; i < springs.length; ++i) {
            const s = springs[i];
            // Check groups.
            if ((m !== s.mA && m !== s.mB) 
            && ((m.c_group === s.c_group && m.c_group !== 0 && s.c_group !== 0)|| m.c_group === -1 || s.c_group === -1)) {
                const S = s.p_seg(m.pos, m.radius);
                // Check overlap.
                if (S !== undefined) {
                    const R = S.nrm().mul(m.radius);
                    const D = R.sub(S);
                    
                    if (!m.isFixed && !s.mA.isFixed && !s.mB.isFixed) {
                        m.pos.mSub(D.div(2));
                        m.prv.mAdd(D.div(2));
                        s.mA.pos.mAdd(D.div(2));
                        s.mB.pos.mAdd(D.div(2));
                        s.mA.prv.mSub(D.div(2));
                        s.mB.prv.mSub(D.div(2));
                    } else if (m.isFixed) {
                        s.mA.pos.mAdd(D);
                        s.mB.pos.mAdd(D);
                        s.mA.prv.mSub(D);
                        s.mB.prv.mSub(D);
                    } else if (s.mA.isFixed || s.mB.isFixed) {
                        m.pos.mSub(D.div(2));
                        m.prv.mAdd(D.div(2));
                        
                    }
                }
            }
        }
    }
    
    // Autoreverse function.
    let autoRevEnable = true;
    let LR_prv = undefined;
    const toggleWaveDirection = () => dir = dir > 0 ? -1 : 1
    const autoReverse = LR => {
        if (autoRevEnable && LR !== undefined && LR !== LR_prv) {
            LR_prv = LR;
            toggleWaveDirection();
        }
    }

    const remSpring = sToRemove => {
        springs = springs.filter(s => s !== sToRemove);
        actuators = actuators.filter(a => a.acted !== sToRemove);
    }
    const remMass = mToRemove => {
        masses = masses.filter(m => m !== mToRemove);
        actuators = actuators.filter(a => a.acted !== mToRemove);
        springs.filter(s => s.mA === mToRemove || s.mB === mToRemove)
        .forEach(s => remSpring(s));
    }

    return {
        isPaused: () => pause,
        togglePause: () => {
            if (pause) pause = false;
            else pause = true;
            return pause;
        },
        toggleCollisions: () => {
            if (collisions_enabled) collisions_enabled = false;
            else collisions_enabled = true;
            return collisions_enabled;
        },
        getScale: () => scale,
        setScale: set => scale = set,
        getDelta: () => delta,
        setFrameTime: set => {
            frameTime = set;
            delta = frameTime / stepsPerFrame;
        },
        getFrameTime: () => frameTime = get,
        setStepsPerFrame: set => {
            stepsPerFrame = set
            delta = frameTime / stepsPerFrame;
        },
        getStepsPerFrame: () => stepsPerFrame,
        addMass: nMass => masses.push(nMass),
        addSpring: nSpring => {
            if (!springs.some(s => (nSpring.mA === s.mA && nSpring.mB === s.mB) || (nSpring.mA === s.mB && nSpring.mB === s.mA)))
                springs.push(nSpring);
            },
        remSpring,
        remMass,
        clear: () => {
            masses = [];
            springs = [];
            actuators = [];
            highlight = undefined;
            select = undefined;
            drag = undefined;
        },
        attachActuator: actuator => actuators.push(actuator),
        getActuator: element => actuators.find(a => element === a.acted),
        remActuator: aToRemove => {
            aToRemove.restore();
            actuators = actuators.filter(a => a !== aToRemove);
        },
        setWaveSpeed: n => wSpd = n,
        setWaveAmplitude: a => amp = a,
        getWaveStats: () => ({ amp, wSpd, t }),
        toggleWave: () => {
            LR_prv = undefined;
            toggleWaveDirection()
        },
        update: () => {
            if (pause) return;

            // Apply model actuators.
            for (let i = 0; i < actuators.length; i++) actuators[i].act(amp, 1, t);
            t += dir * wSpd * delta; // update actuator wave time.

            // Apply model spring forces.
            for(let i = 0; i < springs.length; ++i) springs[i].apply_F(delta);
            
            // Update model state.
            for (let i = 0; i < masses.length; ++i) {
                const m = masses[i];
                // Model acceleration.
                m.F_sum.mAdd(env.g.mul(m.mass).add(m.get_v(delta).mul(-env.d).add(m.fric_prv)));
                env.screenFriction(m);
                m.v_accel(delta);
                m.F_sum.set();
            
                // Collision corrections.
                if (collisions_enabled)
                {
                    ms_collide(m);
                    // mm_collide(m, false);
                    m.m_collide(masses, false);
                }
                env.boundCollide(m, false);
                const LR = env.s_boundHit(m, false);
                autoReverse(LR); // Check if model wave should reverse direction.

                // Model inertia.
                m.v_iner();
                
                // Collision deflections.
                if (collisions_enabled)
                    m.m_collide(masses, true);
                    // mm_collide(m, true);

                env.s_boundHit(m, true);
                env.boundCollide(m, true);
            }
        },
        environment: () => env,
        nearestMass: (pos, rad) => masses.find(m => m.pos.isInRad(pos, m.radius + rad)),
        nearestSpring: (pos, rad) => springs.find(s => s.p_seg(pos, rad) !== undefined),
        getCenter: () => masses.reduce((c, m) => m.pos.add(c), new v2d()).div(masses.length),
        setHighlight: element => highlight = element,
        setSelect: () => {
            select = highlight;
            if (select) // drag can be either a spring or a mass.
                {
                    if (Spring.prototype.isPrototypeOf(select)) {
                        select.mA.ignore = true;
                        select.mB.ignore = true;
                        select.mA.prv.mEqu(select.mA.pos);
                        select.mB.prv.mEqu(select.mB.pos);
                    } else {
                        select.ignore = true;
                        select.prv.mEqu(select.pos);
                    }
                }
            drag = select;
            return select;
        },
        forceSelect: m => select = m,
        getHighlight: () => highlight,
        getSelect: () => select,
        dragAction: (dx, dy) => {
            const D = new v2d(dx, dy);
            if (drag !== undefined) {
                // Prevent velocity changes in pause mode when user moves elements.
                drag.translate(D.div(scale), !pause);
            }
        },
        clearDrag: () => {
            if (drag !== undefined) {
                if (Spring.prototype.isPrototypeOf(drag)) {
                    drag.mA.ignore = false;
                    drag.mB.ignore = false;
                } else {
                    drag.ignore = false;
                }
                drag = undefined;
            }
        },
        draw: (ctx, theme) => {
            for (let i = 0; i < springs.length; ++i) {
                const s = springs[i];
                const widthHold = ctx.lineWidth;
                let q4 = s.seg_length();
                let q3 = s.Fs(delta);
                let q2_a = q3.mag2();
                let q2 = q3.mag();
                var q = Math.floor(q2 * q2);
                if (q > 255) {
                    q = 255;
                }
                if (q < 0) {
                    q = 0;
                }
                var other = (255 - q).toString(16).padStart(2, '0');
                var other2 = q.toString(16).padStart(2, '0');
                var s_color = '#' + other + 'FF00'; // green compress
                if (q4 > s.rst) {
                    s_color = '#' + 'FF' + other + '00'; // red extend
                }
                if (Math.abs(q4 - s.rst) < 0.1) {
                    s_color = '#FFFF00';
                }
                if (s === highlight) {
                    ctx.lineWidth = 5
                    s_color = theme.s_highlighted;
                }
                if (s === select) {
                    ctx.lineWidth = 5
                    s_color = theme.s_selected;
                }
                ctx.strokeStyle = s_color;
                s.draw(ctx, scale);
                ctx.lineWidth = widthHold;
            };
            for (let i = 0; i < masses.length; ++i) {
                const m = masses[i];
                let m_color = theme.mass;
                let addedSize = 0;
                // Set user indicators.
                if (m === highlight) {
                    m_color = theme.m_highlighted;
                    addedSize = 0.01;
                }
                if (m === select) {
                    m_color = theme.m_selected;
                    addedSize = 0.015;
                }
                
                // Draw the mass.
                ctx.fillStyle = m_color;
                m.draw(ctx, scale, addedSize);
                if (m.isFixed) {
                    ctx.fillStyle = theme.fixed_center;
                    m.draw(ctx, scale, -m.radius / 2);
                }
            };
        },
        export: () => JSON.stringify(
            { init: { environment: env, waveform: { amp, wSpd, t },
                scale, frameTime, stepsPerFrame, delta, collisions_enabled },
            masses, springs, actuators },
            function(key, value) {
                // Replace masses in spring with indices to masses.
                if (key === 'mA' || key === 'mB') return masses.indexOf(value);
                // Replace elements in actuator with their indices to arrays.
                else if (key === 'acted') {
                    let iAct = masses.indexOf(value);
                    if (iAct > 0) return iAct;
                    else return springs.indexOf(value);
                }
                else return value;
            }, 4),
        // Loads only bare model without environment or destroying current model.
        import: model => {
            const loaded = JSON.parse(model);
            const ml = masses.length;
            const sl = springs.length;
            
            loaded.masses.forEach(m => {
                const x = new Mass({ x: m.pos.x, y: m.pos.y }, m.radius, m.mass);
                x.prv.set(m.prv.x, m.prv.y);
                x.refl = m.refl;
                x.mu_s = m.mu_s;
                x.mu_k = m.mu_k;
                x.c_group = m.c_group;
                x.F_sum.mEqu(m.F_sum);
                x.fric_prv.mEqu(m.fric_prv);
                x.isFixed = m.isFixed;
                masses.push(x);
            });

            loaded.springs.forEach(s => {
                const x = new Spring(masses[ml + s.mA], masses[ml + s.mB], s.rst, s.stf, s.dmp);
                x.c_group = s.c_group;
                springs.push(x);
            });

            loaded.actuators.forEach(a => {
                let x;
                switch (a.type) {
                case 'SpringMuscle':
                    x = new MuscleSpringActuator(springs[sl + a.acted], a.phase, a.sense);
                    break;
                case 'SpringRelax':
                    x = new RelaxationSpringActuator(springs[sl + a.acted], a.phase, a.sense);
                    break;
                case 'MassBalloon':
                    x = new BalloonMassActuator(masses[ml + a.acted], a.phase, a.sense, a.mult);
                    break;
                case 'MassVary':
                    x = new VaryMassActuator(masses[ml + a.acted], a.phase, a.sense, a.mult);
                    break;
                }
                x.default = a.default;
                actuators.push(x);
            });

            env.g.x = loaded.init.environment.g.x;
            env.g.y = loaded.init.environment.g.y;
        },
        dickNBalls: () => {
            // Model.export().replaceAll("\n", "").replaceAll(" ", "")
            Model.clear();
            Model.import('{"init":{"environment":{"g":{"x":0,"y":4.91},"d":0,"bounds":[],"s_bounds":{"x":0,"y":0,"w":12,"h":6.751740139211138}},"waveform":{"amp":0.5,"wSpd":0.5,"t":335.04499999971154},"scale":96.08333333333333,"frameTime":0.016666666666666666,"stepsPerFrame":5,"delta":0.003333333333333333,"collisions_enabled":true},"masses":[{"mass":0.08,"radius":0.08,"pos":{"x":3.9921044915466246,"y":1.495367639507778},"prv":{"x":3.992104869697198,"y":1.495365576057596},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.16,"radius":0.08,"pos":{"x":6.14640731081059,"y":0.8809567798054946},"prv":{"x":6.14640731081059,"y":0.8809567798054946},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":true,"ignore":false},{"mass":0.16,"radius":0.08,"pos":{"x":6.050878372123074,"y":2.2115933471006652},"prv":{"x":6.050878372123074,"y":2.2115933471006652},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":true,"ignore":false},{"mass":0.08,"radius":0.08,"pos":{"x":4.533234441167715,"y":2.651757914378373},"prv":{"x":4.53323336663987,"y":2.6517565581204408},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.08,"radius":0.08,"pos":{"x":3.3924841907134717,"y":1.838246047854181},"prv":{"x":3.392484197304381,"y":1.8382430744406335},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.08,"radius":0.08,"pos":{"x":3.982808282549449,"y":2.9798293245191205},"prv":{"x":3.982806684755923,"y":2.979827204949393},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.08,"radius":0.05,"pos":{"x":2.4425747045682735,"y":2.74846417894886},"prv":{"x":2.4425734734468847,"y":2.74845936507067},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.08,"radius":0.05,"pos":{"x":3.395008530720386,"y":3.5544722763011083},"prv":{"x":3.395005826404522,"y":3.554469235035076},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.16,"radius":0.05,"pos":{"x":2.40833250391851,"y":3.822504577826222},"prv":{"x":2.4083292939464886,"y":3.822499666688743},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.08,"radius":0.05,"pos":{"x":2.2102340158508973,"y":3.629954044331891},"prv":{"x":2.210231159568965,"y":3.6299487737413942},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.16,"radius":0.08,"pos":{"x":6.54640069384215,"y":2.237640936686904},"prv":{"x":6.54640069384215,"y":2.237640936686904},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":true,"ignore":false},{"mass":0.16,"radius":0.08,"pos":{"x":6.54640069384215,"y":0.8846487424111015},"prv":{"x":6.54640069384215,"y":0.8846487424111015},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":true,"ignore":false},{"mass":0.08,"radius":0.36,"pos":{"x":6.809299119273207,"y":3.926691660941199},"prv":{"x":6.809295745934795,"y":3.926692713862828},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.16,"radius":0.32,"pos":{"x":6.494792771441079,"y":5.539970824819892},"prv":{"x":6.494573270110539,"y":5.539928808674255},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.16,"radius":0.31,"pos":{"x":7.126873557584272,"y":5.532825001713248},"prv":{"x":7.126655019450538,"y":5.532869326124972},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.08,"radius":0.05,"pos":{"x":5.609387521183858,"y":3.209684494892718},"prv":{"x":5.6093858353965445,"y":3.2096834375032977},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.14,"radius":0.08,"pos":{"x":8.366370690081068,"y":4.27342871070283},"prv":{"x":8.366370690081068,"y":4.27342871070283},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":true,"ignore":false},{"mass":0.08,"radius":0.08,"pos":{"x":3.671084761607035,"y":3.176605896444144},"prv":{"x":3.6710827949522673,"y":3.1766033166915335},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.16,"radius":0.08,"pos":{"x":2.9176017648139414,"y":2.3056979830256012},"prv":{"x":2.917601216996562,"y":2.305694131254865},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.16,"radius":0.08,"pos":{"x":5.295665506505986,"y":1.0379961116643466},"prv":{"x":5.295665661636708,"y":1.0379956227781661},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":false,"ignore":false},{"mass":0.16,"radius":0.08,"pos":{"x":6.09744779582367,"y":0.6542923433874711},"prv":{"x":6.09744779582367,"y":0.6542923433874711},"refl":0.75,"mu_s":0.8,"mu_k":0.6,"c_group":0,"F_sum":{"x":0,"y":0},"fric_prv":{"x":0,"y":0},"isFixed":true,"ignore":false}],"springs":[{"mA":1,"mB":2,"rst":1.3325427728362467,"stf":50,"dmp":5,"c_group":0},{"mA":3,"mB":0,"rst":1.290546400693842,"stf":50,"dmp":5,"c_group":0},{"mA":0,"mB":2,"rst":2.320808650925699,"stf":25.65,"dmp":5,"c_group":0},{"mA":1,"mB":3,"rst":2.330247113116498,"stf":25.65,"dmp":5,"c_group":0},{"mA":0,"mB":4,"rst":0.6400321692309907,"stf":78.15,"dmp":5,"c_group":0},{"mA":4,"mB":5,"rst":1.2862166127765053,"stf":50,"dmp":5,"c_group":0},{"mA":5,"mB":3,"rst":0.6660847174695195,"stf":86.73,"dmp":5,"c_group":0},{"mA":3,"mB":4,"rst":1.4296385289312927,"stf":67.44,"dmp":5,"c_group":0},{"mA":0,"mB":5,"rst":1.4589741681648434,"stf":77.08,"dmp":5,"c_group":0},{"mA":6,"mB":7,"rst":1.306935080412456,"stf":21.37,"dmp":5,"c_group":0},{"mA":5,"mB":6,"rst":1.5689311464022206,"stf":23.51,"dmp":5,"c_group":0},{"mA":4,"mB":7,"rst":1.6312116819494786,"stf":22.44,"dmp":5,"c_group":0},{"mA":7,"mB":8,"rst":1.0095403295750218,"stf":50,"dmp":5,"c_group":0},{"mA":8,"mB":9,"rst":0.26757939563953037,"stf":100,"dmp":5,"c_group":0},{"mA":9,"mB":6,"rst":0.8897764761071917,"stf":50,"dmp":5,"c_group":0},{"mA":6,"mB":8,"rst":1.0743580559012473,"stf":50,"dmp":5,"c_group":0},{"mA":9,"mB":7,"rst":1.2052199936899848,"stf":50,"dmp":5,"c_group":0},{"mA":2,"mB":10,"rst":0.3300297140298673,"stf":50,"dmp":5,"c_group":0},{"mA":10,"mB":11,"rst":1.3328272480345913,"stf":50,"dmp":5,"c_group":0},{"mA":11,"mB":1,"rst":0.3211159488171198,"stf":50,"dmp":5,"c_group":0},{"mA":1,"mB":10,"rst":1.3849842508953467,"stf":50,"dmp":5,"c_group":0},{"mA":11,"mB":2,"rst":1.3576969450615823,"stf":50,"dmp":5,"c_group":0},{"mA":10,"mB":12,"rst":1.5896785278159262,"stf":24.58,"dmp":5,"c_group":0},{"mA":12,"mB":2,"rst":1.6001120387266168,"stf":22.44,"dmp":5,"c_group":0},{"mA":12,"mB":13,"rst":1.6079370821120105,"stf":22.44,"dmp":5,"c_group":0},{"mA":13,"mB":14,"rst":0.6352067102723521,"stf":50,"dmp":5,"c_group":0},{"mA":14,"mB":12,"rst":1.601558430113139,"stf":22.44,"dmp":5,"c_group":0},{"mA":3,"mB":15,"rst":1.1288972427188906,"stf":35.3,"dmp":5,"c_group":0},{"mA":15,"mB":12,"rst":1.3497917538062516,"stf":48.15,"dmp":5,"c_group":0},{"mA":15,"mB":2,"rst":1.1221266501549463,"stf":27.8,"dmp":5,"c_group":0},{"mA":15,"mB":10,"rst":1.295572564337521,"stf":25.65,"dmp":5,"c_group":0},{"mA":12,"mB":1,"rst":3.265848941496562,"stf":25.65,"dmp":5,"c_group":0},{"mA":12,"mB":11,"rst":3.183588066184844,"stf":24.58,"dmp":5,"c_group":0},{"mA":12,"mB":16,"rst":1.528192085159763,"stf":58.87,"dmp":5,"c_group":0},{"mA":5,"mB":17,"rst":0.3929010445767754,"stf":24.58,"dmp":5,"c_group":0},{"mA":17,"mB":7,"rst":0.5373388047208265,"stf":23.51,"dmp":5,"c_group":0},{"mA":17,"mB":4,"rst":1.4013325215897954,"stf":24.58,"dmp":5,"c_group":0},{"mA":17,"mB":6,"rst":1.2712747856978066,"stf":22.44,"dmp":5,"c_group":0},{"mA":6,"mB":18,"rst":0.5981754415915429,"stf":23.51,"dmp":5,"c_group":0},{"mA":18,"mB":4,"rst":0.570426367213269,"stf":24.58,"dmp":5,"c_group":0},{"mA":18,"mB":7,"rst":1.305084725378194,"stf":24.58,"dmp":5,"c_group":0},{"mA":18,"mB":5,"rst":1.3125621488505879,"stf":24.58,"dmp":5,"c_group":0},{"mA":3,"mB":2,"rst":1.7735601237383025,"stf":50,"dmp":5,"c_group":0},{"mA":0,"mB":19,"rst":0.963396304347603,"stf":18.15,"dmp":5,"c_group":0},{"mA":19,"mB":1,"rst":1.1614881265007033,"stf":50,"dmp":5,"c_group":0},{"mA":19,"mB":3,"rst":1.7002628800427622,"stf":50,"dmp":5,"c_group":0},{"mA":19,"mB":2,"rst":1.3691328245181844,"stf":50,"dmp":5,"c_group":0},{"mA":19,"mB":20,"rst":0.3828276346401074,"stf":50,"dmp":5,"c_group":0}],"actuators":[]}');
        },
        save: () => {
            localStorage.setItem("saved", Model.export());
        },
        load: () => {
            Model.clear();
            let v = localStorage.getItem("saved");
            if (v != null) {
                try {
                    Model.import(v);    
                }
                catch {
                    Model.dickNBalls();
                }
            }
            else {
                Model.dickNBalls();
            }
        },
    };
})();