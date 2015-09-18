require 'minitest/autorun'

# Black box tests for 'arv get' command.
class TestArvGet < Minitest::Test
  # UUID for an Arvados object that does not exist
  NON_EXISTANT_OBJECT_UUID = "qr1hi-tpzed-p8yk1lihjsgwew0"

  # Tests that a valid Arvados object can be retrieved in JSON format using:
  # `arv get [uuid] --format json`.
  def test_get_valid_object_json_format()
    stored_value = __method__
    uuid = create_arv_object_containing_value(stored_value)
    out, err = capture_subprocess_io do
      arv_get(uuid, '--format', 'json')
    end
    assert_empty(err)
    assert(does_arv_object_as_json_use_value(uuid, stored_value))
  end

  # Tests that a valid Arvados object can be retrieved in YAML format using:
  # `arv get [uuid] --format yaml`.
  def test_get_valid_object_yaml_format()
    stored_value = __method__
    uuid = create_arv_object_containing_value(stored_value)
    out, err = capture_subprocess_io do
      arv_get(uuid, '--format', 'yaml')
    end
    assert_empty(err)
    assert(does_arv_object_as_yaml_use_value(uuid, stored_value))
  end

  # Tests that a valid Arvados object can be retrieved in a supported format
  # using: `arv get [uuid]`.
  def test_get_valid_object_no_format()
    stored_value = __method__
    uuid = create_arv_object_containing_value(stored_value)
    out, err = capture_subprocess_io do
      arv_get(uuid)
    end
    assert_empty(err)
    assert(does_arv_object_as_yaml_use_value(uuid, stored_value) ||
        does_arv_object_as_json_use_value(uuid, stored_value))
  end

  # Tests that an valid Arvados object is not retrieved when specifying an
  # invalid format: `arv get [uuid] --format invalid`.
  def test_get_object_invalid_format()
    stored_value = __method__
    uuid = create_arv_object_containing_value(stored_value)
    out, err = capture_subprocess_io do
      arv_get(uuid, '--format', 'invalid')
    end
    refute_empty(err)
    assert_empty(out)
  end

  # Tests that an invalid (non-existant) Arvados object is not retrieved using:
  # using: `arv get [non-existant-uuid] --format json`.
  def test_get_invalid_object_json_format()
    out, err = capture_subprocess_io do
      arv_get(NON_EXISTANT_OBJECT_UUID, '--format', 'json')
    end
    refute_empty(err)
    assert_empty(out)
  end

  # Tests that an invalid (non-existant) Arvados object is not retrieved using:
  # using: `arv get [non-existant-uuid] --format yaml`.
  def test_get_invalid_object_yaml_format()
    out, err = capture_subprocess_io do
      arv_get(NON_EXISTANT_OBJECT_UUID, '--format', 'yaml')
    end
    refute_empty(err)
    assert_empty(out)
  end

  # Tests that an invalid (non-existant) Arvados object is not retrieved using:
  # using: `arv get [non-existant-uuid]`.
  def test_get_invalid_object_no_format()
    out, err = capture_subprocess_io do
      arv_get(NON_EXISTANT_OBJECT_UUID)
    end
    refute_empty(err)
    assert_empty(out)
  end

  # Tests that an invalid (non-existant) Arvados object is not retrieved when
  # specifying an invalid format:
  # `arv get [non-existant-uuid] --format invalid`.
  def test_get_object_invalid_format()
    out, err = capture_subprocess_io do
      arv_get(NON_EXISTANT_OBJECT_UUID, '--format', 'invalid')
    end
    refute_empty(err)
    assert_empty(out)
  end

  protected
  # Runs 'arv get <varargs>' with given arguments.
  def arv_get(*args)
    system ['./bin/arv', 'arv get'], *args
  end

  # Creates an Arvados object that stores a given value.
  # TODO: Must return uuid
  def create_arv_object_with_value(value)
      out, err = capture_subprocess_io do
        # Write (without redirect)
        system ['./bin/arv', 'arv create log'], *args
      end
      if err.length > 0
        raise "Could not create Arvados object with given value"
      end
#    system ['./bin/arv', 'arv user create'], *args
  end

  # Checks whether the Arvados object, represented in JSON format, with the
  # given uuid, uses the given value.
  def does_arv_object_as_json_use_value(uuid, value)
    # TODO
  end

  # Checks whether the Arvados object, represented in YAML format, with the
  # given uuid, uses the given value.
  def does_arv_object_as_yaml_use_value(uuid, value)
    # TODO
  end
end
