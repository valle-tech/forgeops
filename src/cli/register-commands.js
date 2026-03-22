import { registerCreateCommands } from '../commands/create.js';
import { registerListCommands } from '../commands/list.js';
import { registerInfoCommands } from '../commands/info.js';
import { registerDeleteCommands } from '../commands/delete.js';
import { registerOpsCommands } from '../commands/ops.js';
import { registerInfraCommands } from '../commands/infra.js';
import { registerObserveCommands } from '../commands/observe.js';
import { registerQualityCommands } from '../commands/quality.js';
import { registerTemplatesCommands } from '../commands/templates.js';
import { registerAuthCommands } from '../commands/auth.js';
import { registerAddCommands } from '../commands/add.js';
import { registerRemoveCommands } from '../commands/remove.js';
import { registerUpdateCommands } from '../commands/update.js';
import { registerInitCommands } from '../commands/init.js';
import { registerDoctorCommands } from '../commands/doctor.js';
import { registerUserConfigCommands } from '../commands/user-config.js';
import { registerUpgradeCommands } from '../commands/upgrade.js';

export function registerCommands(program) {
  registerInitCommands(program);
  registerDoctorCommands(program);
  registerUserConfigCommands(program);
  registerUpgradeCommands(program);
  registerCreateCommands(program);
  registerAddCommands(program);
  registerRemoveCommands(program);
  registerUpdateCommands(program);
  registerListCommands(program);
  registerInfoCommands(program);
  registerDeleteCommands(program);
  registerOpsCommands(program);
  registerInfraCommands(program);
  registerObserveCommands(program);
  registerQualityCommands(program);
  registerTemplatesCommands(program);
  registerAuthCommands(program);
}
