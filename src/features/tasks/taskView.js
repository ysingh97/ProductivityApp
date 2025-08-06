import { useState } from "react";
import TaskCard from "./taskCard";

const TaskView = ({ task }) => {
    const [parentGoal, setParentGoal] = useState(null); 
    console.log("TaskVew top");

    if (!task) {
        return <p>Loading task...</p>
    }
    return (
        <div>
            <TaskCard task={task}/>
        </div>
    )
}

export default TaskView;