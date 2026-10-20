// ============================================================
//  STARVIOS - Anomalías que necesitan eventos de Forge (startup)
//  - Día 17 (nerf 1): los cultivos crecen a la mitad de velocidad
//  - Día 1  (nerf 2): sin regeneración natural mientras tengas el efecto Hambre
//  Solo hacen algo cuando se activan con /starvios nerf1 17 y /starvios nerf2 1.
//  Los startup_scripts solo se cargan al ARRANCAR el servidor (no con /reload).
// ============================================================
ForgeEvents.onEvent('net.minecraftforge.event.level.BlockEvent$CropGrowEvent$Pre', event => {
  try {
    if (!global.stEfMapa || !global.stEfMapa['17n1']) return;
    if (Math.random() < 0.5) event.setResult('DENY');
  } catch (e) {}
});

let ST_EFECTOS = null;
ForgeEvents.onEvent('net.minecraftforge.event.entity.living.LivingHealEvent', event => {
  try {
    if (!global.stEfMapa || !global.stEfMapa['1n2']) return;
    let e = event.getEntity();
    if (!e || !e.isPlayer()) return;
    if (event.getAmount() > 1.0) return;   // la regeneración natural cura de 1 en 1 (pociones y comida dorada curan más)
    if (!ST_EFECTOS) ST_EFECTOS = Java.loadClass('net.minecraft.world.effect.MobEffects');
    if (e.hasEffect(ST_EFECTOS.HUNGER)) event.setCanceled(true);
  } catch (e) {}
});
