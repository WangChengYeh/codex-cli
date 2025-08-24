use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Status { Pending, InProgress, Completed }

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PlanStep { pub id: String, pub step: String, pub status: Status }

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct Plan { pub steps: Vec<PlanStep> }

#[derive(Debug, Error)]
pub enum PlanError { #[error("exactly one step must be in_progress unless all completed")] Invalid }

impl Plan {
  pub fn update(&mut self, steps: Vec<PlanStep>) -> Result<(), PlanError> {
    let in_prog = steps.iter().filter(|s| matches!(s.status, Status::InProgress)).count();
    let all_completed = steps.iter().all(|s| matches!(s.status, Status::Completed));
    if !all_completed && in_prog != 1 { return Err(PlanError::Invalid); }
    self.steps = steps;
    Ok(())
  }
}

