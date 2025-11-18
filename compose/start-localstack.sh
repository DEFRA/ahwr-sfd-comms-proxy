#!/bin/bash
export AWS_REGION=eu-west-2
export AWS_DEFAULT_REGION=eu-west-2
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

function create_topic() {
  local topic_name=$1
  local topic_arn=$(awslocal sns create-topic --name $topic_name --query "TopicArn" --output text)
  echo $topic_arn
}

function create_queue() {
  local queue_name=$1

  # Create the DLQ
  local dlq_url=$(
    awslocal sqs create-queue \
    --queue-name "$queue_name-dead-letter-queue" \
    --query "QueueUrl" --output text
  )

  local dlq_arn=$(
    awslocal sqs get-queue-attributes \
      --queue-url $dlq_url \
      --attribute-name "QueueArn" \
      --query "Attributes.QueueArn" \
      --output text
  )

  # Create the queue with DLQ attached
  local queue_url=$(
    awslocal sqs create-queue \
      --queue-name $queue_name \
      --attributes '{ "RedrivePolicy": "{\"deadLetterTargetArn\":\"'$dlq_arn'\",\"maxReceiveCount\":\"1\"}" }' \
      --query "QueueUrl" \
      --output text
  )

  local queue_arn=$(
    awslocal sqs get-queue-attributes \
      --queue-url $queue_url \
      --attribute-name "QueueArn" \
      --query "Attributes.QueueArn" \
      --output text
  )

  echo $queue_arn
}

function subscribe_queue_to_topic() {
  local topic_arn=$1
  local queue_arn=$2

  awslocal sns subscribe --topic-arn $topic_arn --protocol sqs --notification-endpoint $queue_arn --attributes '{ "RawMessageDelivery": "true" }'
}

function create_topic_and_queue() {
  local topic_name=$1
  local queue_name=$2

  local topic_arn=$(create_topic $topic_name)
  local queue_arn=$(create_queue $queue_name)

  subscribe_queue_to_topic $topic_arn $queue_arn
}

create_topic_and_queue "ahwr_message_request" "ahwr_sfd_message_queue"

wait

awslocal sqs list-queues
awslocal sns list-topics

echo "SNS/SQS ready"

# Add an example message to the ahwr_document_request topic ready for processing from queue
awslocal sns publish --topic-arn arn:aws:sns:eu-west-2:000000000000:ahwr_message_request --message '{"crn":1060000000,"sbi":987654321,"dateTime":"2024-11-11T12:01:01.001Z","customParams":{"reference":"IAHW-ABC1-1061"},"emailAddress":"defra-vets-visits-testing@equalexperts.com","notifyTemplateId":"2f9b1e0e-b678-481c-839e-892ebf42fddf","agreementReference":"IAHW-ABC1-1061"}' --message-attributes '{"messageType":{"DataType":"String","StringValue":"uk.gov.ffc.ahwr.sfd.request"}}'

