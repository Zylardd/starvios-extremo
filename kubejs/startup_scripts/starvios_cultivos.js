// ============================================================
//  STARVIOS - Anomalía día 17 (nerf 1): los cultivos crecen a la mitad de velocidad
//  Solo hace algo cuando se activa con /starvios nerf1 17.
//  Los startup_scripts solo se cargan al ARRANCAR el servidor (no con /reload).
// ============================================================
ForgeEvents.onEvent('net.minecraftforge.event.level.BlockEvent$CropGrowEvent$Pre', event => {
  try {
    if (!global.stEfMapa || !global.stEfMapa['17n1']) return;
    if (Math.random() < 0.5) event.setResult('DENY');
  } catch (e) {}
});
