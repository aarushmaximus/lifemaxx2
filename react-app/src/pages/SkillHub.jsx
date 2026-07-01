import React from 'react';
import SkillHubComponent from '../components/SkillHub';
import { store } from '../lib/store';

export default function SkillHub() {
  // Grab the first macro for testing if no routing context is provided yet
  const macros = store.getMacros();
  const firstMacroId = macros.length > 0 ? macros[0].id : null;
  return <SkillHubComponent macroId={firstMacroId} />;
}
