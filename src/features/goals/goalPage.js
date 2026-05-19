import React, { useState, useEffect } from 'react';
import { fetchGoalById } from './goalService';
import GoalView from './goalView';
import { useParams } from "react-router-dom";

const GoalPage = () => {
  const [goal, setGoal] = useState(null);
  const { goalId } = useParams();

  //console.log("GoalPage is rendering", goalId);

  useEffect(() => {
    const loadGoal = async () => {
      try {
          const goalData = await fetchGoalById(goalId)
          setGoal(goalData);
      } catch (err) {
          console.error(err.message);
      }
    };
    loadGoal();
  }, [goalId]);
  //console.log("goalPage goal: ", goal);
  return (
    <div>
        <GoalView goal={goal}/>
      {/* <p>Goal Page for {goalId}</p> */}
    </div>
  );
};

export default GoalPage;
