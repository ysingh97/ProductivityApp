import React, { useEffect, useState } from 'react'
import { fetchTaskById } from './taskService';
import TaskView from './taskView';
import { useParams } from 'react-router-dom';

const TaskPage = () => {
    const [task, setTask] = useState(null);
    const { taskId } = useParams();
    console.log("🧩 taskId:", taskId);
    console.log("🧪 typeof fetchTaskById:", typeof fetchTaskById);

    // useEffect(() => {
    //     console.log("🎯 useEffect ran");
    //     fetchTaskById(taskId)
    // .then(data => console.log("📦 data:", data))
    // .catch(err => console.error("❌ fetch error:", err));
    // });

    useEffect(() => {
        console.log("✅ useEffect ran with taskId:", taskId);
        const loadTask = async () => {
            try {
                console.log("in loadtask")
                const taskData = await fetchTaskById(taskId);
                console.log("taskPage useEffect. taskData: ", {taskData});
                setTask(taskData);
            } catch (err) {
                console.error("useEffect fetch error: ", err.message);
            }
        };
        loadTask();
    }, [taskId]);

    return (
        <div>
            <TaskView task={task}/>
        </div>
    )
};

export default TaskPage;