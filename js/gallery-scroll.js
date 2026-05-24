import * as THREE from 'three';

// Configuration
const CONFIG = {
    slideCount: 4,
    spacingX: 35, // Horizontal space between artworks
    camZ: 25,     // Camera distance
    wallAngleY: 0.15, // Positive angle so items recede (don't get bigger)
    cards: [
        {
            img: 'images/oo1.jpeg',
            title: 'OO1 - Cold',
            desc: 'A chilling exploration of isolation and depth.',
            link: 'oo1.html',
            year: '01'
        },
        {
            img: 'images/oo2.jpeg',
            title: 'OO2 - Desire',
            desc: 'The burning rhythmic pulse of longing.',
            link: 'oo2.html',
            year: '02'
        },
        {
            img: 'images/your_arms.jpg',
            title: 'Your Arms',
            desc: 'Embrace the warmth of the unknown.',
            link: 'your_arms.html',
            year: '03'
        },
        {
            img: 'images/her_echo.jpeg',
            title: 'HER ECHO',
            desc: 'Reverberations of a memory fading into void.',
            link: 'her_echo.html',
            year: '04'
        }
    ]
};

let scene, camera, renderer;
let galleryGroup;
let scrollTrack, stickyView;
let currentProgress = 0;
let targetProgress = 0;

// Init
export function initGallery() {
    scrollTrack = document.querySelector('.gallery-scroll-track');
    stickyView = document.querySelector('.gallery-sticky-view');
    const root = document.getElementById('gallery-3d-root');

    if (!root || !scrollTrack) {
        console.warn('Gallery elements not found');
        return;
    }

    // Scene
    scene = new THREE.Scene();
    // Use dark background but with some fog to blend
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 10, 90);

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, CONFIG.camZ);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    root.appendChild(renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 10);
    scene.add(dirLight);

    // Group
    galleryGroup = new THREE.Group();
    scene.add(galleryGroup);
    galleryGroup.position.x = 2; // Slight offset

    // Create Slides
    const textureLoader = new THREE.TextureLoader();
    const planeGeo = new THREE.PlaneGeometry(12, 12); // Square-ish art

    CONFIG.cards.forEach((card, i) => {
        const group = new THREE.Group();
        group.position.set(i * CONFIG.spacingX, 0, 0);

        // Image
        textureLoader.load(card.img, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            const mat = new THREE.MeshBasicMaterial({ map: tex });
            const mesh = new THREE.Mesh(planeGeo, mat);
            group.add(mesh);
        });

        // Frame/Border
        const edges = new THREE.EdgesGeometry(planeGeo);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x333333 });
        const outline = new THREE.LineSegments(edges, lineMat);
        group.add(outline);

        // Shadow/Glow (removed per user request to avoid grey background)
        /* 
        const shadowGeo = new THREE.PlaneGeometry(12, 12);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 });
        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.position.set(0.5, -0.5, -0.1);
        group.add(shadow);
        */

        // Add UserData for Raycasting if we want 3D clicks
        group.userData = { link: card.link };

        galleryGroup.add(group);
    });

    // Angle the wall
    galleryGroup.rotation.y = CONFIG.wallAngleY;

    // Events
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll);

    // Start loop
    animate();

    // Initial sync
    onScroll();
}

function onScroll() {
    if (!scrollTrack) return;

    const rect = scrollTrack.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const trackHeight = scrollTrack.offsetHeight;

    // Calculate how far we've scrolled into the track
    // When rect.top is 0, we are at start (0%)
    // When rect.bottom is viewportHeight, we are at end (100%)

    // Distance scrolled from top of track
    const scrolled = -rect.top;
    const maxScroll = trackHeight - viewportHeight;

    let p = scrolled / maxScroll;
    p = Math.max(0, Math.min(1, p)); // Clamp 0..1

    targetProgress = p;
}

function updateUI() {
    // Determine which slide is "active" based on scroll progress
    // We have N slides. 
    // If progress is near 0 -> Slide 0
    // If progress is near 1/3 -> Slide 1
    // If progress is near 2/3 -> Slide 2
    // If progress is near 1 -> Slide 3

    const totalSlides = CONFIG.cards.length;
    const step = 1 / (totalSlides - 0.5); // Tune this denominator to control pacing
    const activeIndex = Math.round(currentProgress / step);

    // Update DOM overlays
    // We assume there's a container in HTML for these, or we create them dynamically.
    // For this implementation, let's assume raw JS updates distinct elements or we create them now.

    // Actually, let's just create the DOM elements once in init if they don't exist? 
    // Or better, let's update opacity of existing ones.

    // To keep it simple, we will dispatch an event or just update classes if we had the DOM.
    // Since we are writing this blindly, let's assume the HTML structure has:
    // id="slide-info-0", id="slide-info-1"...

    for (let i = 0; i < totalSlides; i++) {
        const el = document.getElementById(`slide-info-${i}`);
        if (el) {
            if (i === activeIndex) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    // Smooth scroll
    currentProgress += (targetProgress - currentProgress) * 0.05;

    // Move camera/group
    // We want to move along X axis
    // Total distance needed: (N-1) * spacingX
    const totalDist = (CONFIG.cards.length - 1) * CONFIG.spacingX;

    // We actually move the group left, or camera right. Let's move group left.
    const xPos = -(currentProgress * (totalDist + 10)); // +10 for some padding at end

    // Apply movement
    // We can also add some Z movement for "walking in" effect? Keep it simple for now.
    galleryGroup.position.x = 8 + xPos; // +8 initial offset

    // Subtle interaction
    // (Optional: Mouse parallax could go here)

    renderer.render(scene, camera);
    updateUI();
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    onScroll();
}

// Global click handler for 3D navigation
// (Simple version: if we wanted to click the meshes.
//  But users can likely just scroll. We can add "Learn More" buttons in the DOM overlay)
