
-- Indexes for optimizing SELECT queries by id or taskid
CREATE INDEX idx_tasks_id ON tasks(id);
CREATE INDEX idx_solutions_taskid ON solutions(taskid);
CREATE INDEX idx_contestations_taskid ON contestations(taskid);
CREATE INDEX idx_invalid_tasks_taskid ON invalid_tasks(taskid);
CREATE INDEX idx_contestation_votes_taskid ON contestation_votes(taskid);
CREATE INDEX idx_task_inputs_taskid_cid ON task_inputs(taskid, cid);
CREATE INDEX idx_jobs_id ON jobs(id);

-- Index for optimizing ORDER BY in SELECT queries on jobs
CREATE INDEX idx_jobs_priority ON jobs(priority DESC);
