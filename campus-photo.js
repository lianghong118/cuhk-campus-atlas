// The aerial mode uses a static subset of Lands Department 3D Visualisation Map tiles.
function createCampusPhotoView(get, translate) {
  const container = get('photo-scene');
  const locations = get('photo-location');
  const cdn = 'https://cesium.com/downloads/cesiumjs/releases/1.146/Build/Cesium/';
  // Longitude, latitude, approximate camera target height, view range.
  const bookmarks = {
    overview: [114.2069, 22.4175, 65, 2050],
    library: [114.2049, 22.4195, 168, 440],
    station: [114.2093, 22.4138, 58, 535],
    'new-asia': [114.2091, 22.4215, 182, 510],
    united: [114.2047, 22.4215, 176, 560],
    shaw: [114.2018, 22.4231, 157, 550],
  };
  let widget;
  let initialization;
  let status = '';
  let active = false;
  let loaded = false;
  let failed = false;

  function setStatus(next) {
    status = next;
    localize();
  }
  function localize() {
    get('photo-status').textContent = translate(status);
  }
  function focus() {
    if (!widget) return;
    const [lon, lat, height, range] = bookmarks[locations.value];
    const { Cartesian3, HeadingPitchRange, Math: geoMath } = window.Cesium;
    widget.camera.lookAt(
      Cartesian3.fromDegrees(lon, lat, height),
      new HeadingPitchRange(geoMath.toRadians(346), geoMath.toRadians(-47), range),
    );
    widget.scene.requestRender();
  }
  function loadEngine() {
    if (window.Cesium) return Promise.resolve();
    window.CESIUM_BASE_URL = cdn;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = cdn + 'Cesium.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }
  async function init() {
    setStatus('正在載入航拍模型…');
    try {
      await loadEngine();
      const C = window.Cesium;
      widget = new C.CesiumWidget(container, {
        globe: false, baseLayer: false, skyBox: false, skyAtmosphere: false,
        requestRenderMode: true, maximumRenderTimeChange: Infinity,
        useDefaultRenderLoop: active, showRenderLoopErrors: false,
      });
      widget.scene.backgroundColor = C.Color.fromCssColorString('#dce5e7');
      widget.scene.screenSpaceCameraController.minimumZoomDistance = 75;
      widget.scene.screenSpaceCameraController.maximumZoomDistance = 4500;
      widget.scene.screenSpaceCameraController.enableTranslate = false;
      widget.scene.screenSpaceCameraController.enableCollisionDetection = false;
      widget.scene.renderError.addEventListener(() => setStatus('此裝置或網絡暫未能開啟航拍模型。可切換至校園圖層，或開啟官方地圖。'));
      const tiles = await C.Cesium3DTileset.fromUrl('campus-photo-tileset.json', {
        maximumScreenSpaceError: 8, cacheBytes: 160 * 1024 * 1024,
      });
      tiles.tileFailed.addEventListener(() => {
        failed = true;
        setStatus('部分圖幅未能載入。可切換至校園圖層繼續瀏覽。');
      });
      tiles.allTilesLoaded.addEventListener(() => {
        if (!loaded) {
          loaded = true;
          if (!failed) setStatus('航拍模型已載入。');
        }
      });
      widget.scene.primitives.add(tiles);
      focus();
    } catch (error) {
      console.error('Campus aerial model:', error);
      setStatus('此裝置或網絡暫未能開啟航拍模型。可切換至校園圖層，或開啟官方地圖。');
      if (widget) {
        widget.destroy();
        widget = undefined;
      }
      initialization = undefined;
    }
  }
  locations.addEventListener('change', focus);
  get('photo-reset').addEventListener('click', focus);
  return {
    localize,
    setActive(next) {
      active = next;
      if (!initialization && active) initialization = init();
      if (widget) {
        widget.useDefaultRenderLoop = active;
        if (active) {
          widget.resize();
          widget.scene.requestRender();
        }
      }
    },
  };
}
