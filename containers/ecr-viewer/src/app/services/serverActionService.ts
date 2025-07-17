"use server";

import { makeServerAction } from "./errorService";
import {
  createProgramArea,
  deleteProgramArea,
  updateProgramArea,
} from "./programAreaService";
import { createUser, deleteUser, updateUser } from "./userService";

// The server actions are segregated from the general service as everything in a "use server"
// file is turned into an action and we want to be more selective about what is compiled as such

// user
export const createUserAction = makeServerAction(createUser);
export const updateUserAction = makeServerAction(updateUser);
export const deleteUserAction = makeServerAction(deleteUser);

// program area
export const createProgramAreaAction = makeServerAction(createProgramArea);
export const updateProgramAreaAction = makeServerAction(updateProgramArea);
export const deleteProgramAreaAction = makeServerAction(deleteProgramArea);
