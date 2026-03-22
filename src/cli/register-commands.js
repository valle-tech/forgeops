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

export function registerCommands(program) {
  registerCreateCommands(program);
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
